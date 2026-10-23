import { clearCompleted, dismissOverdue, sortByDue } from '@/lib/todo/commands/bulk'
import { fail } from '@/lib/todo/commands/helpers'
import { createItem, deleteItem, editItem, moveItem, toggleDone } from '@/lib/todo/commands/items'
import {
  applyStructureToSeries,
  createSeries,
  deleteSeries,
  editSeries,
  endSeries,
  makeRecurring,
} from '@/lib/todo/commands/series'
import type { Celebration, Command, Outcome, RunResult } from '@/lib/todo/commands/types'
import type { Ctx } from '@/lib/todo/ctx'
import { planImport } from '@/lib/todo/export-import'
import { appendHistory, buildEvent, type EventDraft } from '@/lib/todo/history'
import { materializeDue } from '@/lib/todo/materialize'
import { diffDocs, isEmptyPatch } from '@/lib/todo/patch'
import { isDayCleared, pruneClearedDays } from '@/lib/todo/stats'
import type { Items } from '@/lib/todo/tree'
import type { HistoryEvent, TodoDocument } from '@/lib/validations/todo'

export type {
  Celebration,
  Command,
  CommandError,
  CommandType,
  RunResult,
} from '@/lib/todo/commands/types'

function reduceCommand(doc: TodoDocument, cmd: Command, ctx: Ctx): Outcome {
  switch (cmd.type) {
    case 'createItem':
      return createItem(doc, cmd, ctx)
    case 'editItem':
      return editItem(doc, cmd, ctx)
    case 'toggleDone':
      return toggleDone(doc, cmd, ctx)
    case 'moveItem':
      return moveItem(doc, cmd, ctx)
    case 'deleteItem':
      return deleteItem(doc, cmd, ctx)
    case 'createSeries':
      return createSeries(doc, cmd, ctx)
    case 'makeRecurring':
      return makeRecurring(doc, cmd, ctx)
    case 'editSeries':
      return editSeries(doc, cmd, ctx)
    case 'applyStructureToSeries':
      return applyStructureToSeries(doc, cmd, ctx)
    case 'endSeries':
      return endSeries(doc, cmd, ctx)
    case 'deleteSeries':
      return deleteSeries(doc, cmd, ctx)
    case 'dismissOverdue':
      return dismissOverdue(doc, cmd, ctx)
    case 'sortByDue':
      return sortByDue(doc, cmd, ctx)
    case 'clearCompleted':
      return clearCompleted(doc, cmd, ctx)
    case 'importDocument': {
      const plan = planImport(doc, cmd.file, cmd.mode, ctx)
      if (!plan.ok) return fail(plan.reason)
      return {
        ok: true,
        ...plan.merged,
        events: [
          {
            type: 'imported',
            itemId: null,
            itemText: '',
            count: plan.summary.itemsAdded + plan.summary.itemsUpdated,
          },
        ],
      }
    }
  }
}

/**
 * Mantém `clearedDays[hoje]` coerente com o estado atual da lista (um dia zerado deixa de ser se
 * entra um item aberto ou se uma conclusão é desfeita) e poda os dias fora da retenção.
 */
export function syncClearedDay(
  clearedDays: Record<string, true>,
  items: Items,
  ctx: Ctx
): Record<string, true> {
  const cleared = isDayCleared(items, ctx.today)
  const has = clearedDays[ctx.today] === true
  let next = clearedDays
  if (cleared && !has) next = { ...clearedDays, [ctx.today]: true }
  else if (!cleared && has) {
    next = { ...clearedDays }
    delete next[ctx.today]
  }
  const pruned = pruneClearedDays(next, ctx.today)
  return Object.keys(pruned).length === Object.keys(next).length ? next : pruned
}

function celebrationFor(
  before: TodoDocument,
  after: TodoDocument,
  completedParents: readonly string[] | undefined,
  ctx: Ctx
): Celebration | null {
  if (after.clearedDays[ctx.today] === true && before.clearedDays[ctx.today] !== true) return 'day'
  return completedParents && completedParents.length > 0 ? 'parent' : null
}

/**
 * Executa um comando sobre o documento: aplica a mudança, recalcula o dia zerado, acrescenta os
 * eventos ao histórico, sobe a revisão e devolve o patch que o desfazer precisa. É pura — o estado
 * novo vem no resultado, nada é mutado.
 */
export function runCommand(doc: TodoDocument, cmd: Command, ctx: Ctx): RunResult {
  const outcome = reduceCommand(doc, cmd, ctx)
  if (!outcome.ok) return outcome

  const changed: TodoDocument = {
    ...doc,
    items: outcome.items ?? doc.items,
    series: outcome.series ?? doc.series,
    cursors: outcome.cursors ?? doc.cursors,
    clearedDays: outcome.clearedDays ?? doc.clearedDays,
    history: outcome.history ?? doc.history,
  }
  const synced: TodoDocument = {
    ...changed,
    clearedDays: syncClearedDay(changed.clearedDays, changed.items, ctx),
  }
  const patch = diffDocs(doc, synced)
  if (isEmptyPatch(patch) && outcome.events.length === 0) return { ok: false, reason: 'no-change' }

  const events = outcome.events.map((draft) => buildEvent(draft, ctx))
  const next: TodoDocument = {
    ...synced,
    history: appendHistory(synced.history, events, ctx),
    rev: doc.rev + 1,
    meta: { ...doc.meta, changesSinceExport: doc.meta.changesSinceExport + 1 },
  }
  return {
    ok: true,
    doc: next,
    patch,
    events,
    label: cmd.type,
    celebrate: celebrationFor(doc, next, outcome.completedParents, ctx),
  }
}

/** Resultado de gerar as ocorrências devidas (um comando do sistema, fora do desfazer). */
export type MaterializeRun = {
  changed: boolean
  doc: TodoDocument
  events: HistoryEvent[]
  created: string[]
  skipped: { seriesId: string; count: number }[]
}

/**
 * Gera as ocorrências que faltam até hoje e registra o que fez no histórico (origem: sistema).
 * Idempotente. Não entra na pilha de desfazer e não conta como alteração para o lembrete de backup.
 */
export function runMaterialize(doc: TodoDocument, ctx: Ctx): MaterializeRun {
  const generated = materializeDue(doc, ctx)
  if (generated.doc === doc) {
    return { changed: false, doc, events: [], created: [], skipped: [] }
  }
  const drafts: EventDraft[] = [
    ...generated.created.map(
      (id): EventDraft => ({
        type: 'occurrence_created',
        itemId: id,
        itemText: generated.doc.items[id].text,
        seriesId: generated.doc.items[id].seriesId ?? undefined,
        origin: 'system',
      })
    ),
    ...generated.skipped.map(
      (entry): EventDraft => ({
        type: 'occurrences_skipped',
        itemId: null,
        itemText: doc.series[entry.seriesId]?.blueprint.text ?? '',
        seriesId: entry.seriesId,
        count: entry.count,
        origin: 'system',
      })
    ),
  ]
  const events = drafts.map((draft) => buildEvent(draft, ctx))
  const next: TodoDocument = {
    ...generated.doc,
    clearedDays: syncClearedDay(generated.doc.clearedDays, generated.doc.items, ctx),
    history: appendHistory(generated.doc.history, events, ctx),
    rev: doc.rev + 1,
  }
  return {
    changed: true,
    doc: next,
    events,
    created: generated.created,
    skipped: generated.skipped,
  }
}
