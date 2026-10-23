import { TODO_UNDO_LIMIT } from '@/constants/todo'
import type { CommandType, RunResult } from '@/lib/todo/commands/types'
import { reconcileFrom } from '@/lib/todo/completion'
import type { Ctx } from '@/lib/todo/ctx'
import { appendHistory, buildEvent, type EventDraft } from '@/lib/todo/history'
import { applyPatch, invertPatch, type Patch } from '@/lib/todo/patch'
import type { TodoDocument } from '@/lib/validations/todo'

/** Um passo do desfazer: a diferença, o comando que a causou e os eventos que ele gerou. */
export type UndoEntry = {
  patch: Patch
  label: CommandType
  eventIds: string[]
}

/** As duas pilhas. Vivem só em memória: recarregar a página ou receber mudança de outra aba as zera. */
export type UndoStacks = { undo: UndoEntry[]; redo: UndoEntry[] }

export const EMPTY_STACKS: UndoStacks = { undo: [], redo: [] }

export type StepResult = { doc: TodoDocument; stacks: UndoStacks; entry: UndoEntry }

/** A entrada de desfazer correspondente a um comando bem-sucedido. */
export function toUndoEntry(result: Extract<RunResult, { ok: true }>): UndoEntry {
  return {
    patch: result.patch,
    label: result.label,
    eventIds: result.events.map((event) => event.id),
  }
}

/** Empilha um passo novo: limpa o "refazer" e descarta o mais antigo acima do limite. */
export function pushUndo(
  stacks: UndoStacks,
  entry: UndoEntry,
  limit: number = TODO_UNDO_LIMIT
): UndoStacks {
  const undo = [...stacks.undo, entry]
  return { undo: undo.length > limit ? undo.slice(undo.length - limit) : undo, redo: [] }
}

/** Aplica um patch como desfazer ou refazer, restaurando o invariante pai↔filhos e registrando o evento. */
function applyStep(
  doc: TodoDocument,
  patch: Patch,
  entry: UndoEntry,
  kind: 'undone' | 'redone',
  ctx: Ctx
): TodoDocument {
  const patched = applyPatch(doc, patch)
  // Por quê: entre o passo e o desfazer pode ter havido geração de ocorrências; reconciliar garante
  // que um pai nunca fique concluído com um filho aberto que apareceu nesse meio-tempo.
  const items = reconcileFrom(patched.items, Object.keys(patch.items), ctx).items

  const originals = new Map(doc.history.map((event) => [event.id, event]))
  const drafts: EventDraft[] = entry.eventIds.flatMap((id) => {
    const original = originals.get(id)
    if (!original) return []
    return [
      {
        type: kind,
        itemId: original.itemId,
        itemText: original.itemText,
        ...(original.seriesId ? { seriesId: original.seriesId } : {}),
        refEventId: original.id,
      },
    ]
  })
  // Os eventos originais podem ter sido podados: ainda assim o desfazer fica registrado.
  if (drafts.length === 0) drafts.push({ type: kind, itemId: null, itemText: '' })

  return {
    ...patched,
    items,
    history: appendHistory(
      patched.history,
      drafts.map((draft) => buildEvent(draft, ctx)),
      ctx
    ),
    rev: doc.rev + 1,
    meta: { ...doc.meta, changesSinceExport: doc.meta.changesSinceExport + 1 },
  }
}

/** Desfaz o último passo. `null` se não há o que desfazer. */
export function undoStep(doc: TodoDocument, stacks: UndoStacks, ctx: Ctx): StepResult | null {
  const entry = stacks.undo.at(-1)
  if (!entry) return null
  return {
    doc: applyStep(doc, invertPatch(entry.patch), entry, 'undone', ctx),
    stacks: { undo: stacks.undo.slice(0, -1), redo: [...stacks.redo, entry] },
    entry,
  }
}

/** Refaz o último passo desfeito. `null` se não há o que refazer. */
export function redoStep(doc: TodoDocument, stacks: UndoStacks, ctx: Ctx): StepResult | null {
  const entry = stacks.redo.at(-1)
  if (!entry) return null
  return {
    doc: applyStep(doc, entry.patch, entry, 'redone', ctx),
    stacks: { undo: [...stacks.undo, entry], redo: stacks.redo.slice(0, -1) },
    entry,
  }
}
