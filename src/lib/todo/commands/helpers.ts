import { TODO_MAX_TEXT_LENGTH } from '@/constants/todo'
import type { CommandError, Outcome } from '@/lib/todo/commands/types'
import { type Ctx, isoNow } from '@/lib/todo/ctx'
import type { EventDraft } from '@/lib/todo/history'
import { childIds, descendantsOf, type Items } from '@/lib/todo/tree'
import type { Blueprint, Item } from '@/lib/validations/todo'

export const fail = (reason: CommandError): Outcome => ({ ok: false, reason })

/** Texto aparado e válido, ou o motivo da recusa. */
export function checkText(
  raw: string
): { ok: true; text: string } | { ok: false; reason: CommandError } {
  const text = raw.trim()
  if (text === '') return { ok: false, reason: 'empty-text' }
  if (text.length > TODO_MAX_TEXT_LENGTH) return { ok: false, reason: 'text-too-long' }
  return { ok: true, text }
}

/** Cópia do item com os campos alterados e o carimbo de atualização. */
export function touch(item: Item, changes: Partial<Item>, ctx: Ctx): Item {
  return { ...item, ...changes, updatedAt: isoNow(ctx) }
}

/** Remove os itens e todos os seus descendentes. Devolve os ids removidos. */
export function removeSubtrees(
  items: Items,
  rootIds: readonly string[]
): { items: Items; removedIds: string[] } {
  const removed = new Set<string>()
  for (const id of rootIds) {
    if (!items[id]) continue
    removed.add(id)
    for (const descendant of descendantsOf(items, id)) removed.add(descendant)
  }
  if (removed.size === 0) return { items, removedIds: [] }
  const next: Items = {}
  for (const [id, item] of Object.entries(items)) if (!removed.has(id)) next[id] = item
  return { items: next, removedIds: [...removed] }
}

/**
 * Tira de cena as ocorrências das séries dadas: as abertas (com a subárvore) saem; as concluídas
 * ficam como itens comuns, sem vínculo com a série — a menos que `deleteDone`.
 */
export function dropSeriesInstances(
  items: Items,
  seriesIds: ReadonlySet<string>,
  deleteDone: boolean,
  ctx: Ctx
): { items: Items; removedIds: string[] } {
  const belongs = (item: Item) => item.seriesId !== null && seriesIds.has(item.seriesId)
  const roots = Object.values(items)
    .filter((item) => belongs(item) && (!item.done || deleteDone))
    .map((item) => item.id)
  const removed = removeSubtrees(items, roots)
  const unlink = Object.values(removed.items).filter(belongs)
  if (unlink.length === 0) return removed
  const next = { ...removed.items }
  for (const item of unlink)
    next[item.id] = touch(item, { seriesId: null, occurrenceOn: null }, ctx)
  return { items: next, removedIds: removed.removedIds }
}

/** O molde de uma ocorrência a partir de um item e de toda a sua subárvore (tudo reaberto). */
export function blueprintOf(items: Items, id: string): Blueprint {
  const item = items[id]
  return {
    text: item.text,
    priority: item.priority,
    children: childIds(items, id).map((childId) => blueprintOf(items, childId)),
  }
}

/** Rascunho de evento para um item. */
export function itemEvent(
  type: EventDraft['type'],
  item: Pick<Item, 'id' | 'text'>,
  extra: Partial<Omit<EventDraft, 'type' | 'itemId' | 'itemText'>> = {}
): EventDraft {
  return { type, itemId: item.id, itemText: item.text, ...extra }
}
