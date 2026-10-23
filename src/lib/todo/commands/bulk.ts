import { fail, removeSubtrees, touch } from '@/lib/todo/commands/helpers'
import type { Command, Outcome } from '@/lib/todo/commands/types'
import { reconcileFrom } from '@/lib/todo/completion'
import type { Ctx } from '@/lib/todo/ctx'
import { addDays } from '@/lib/todo/dates'
import { rankBySoonestDue } from '@/lib/todo/order'
import { siblingsOf } from '@/lib/todo/tree'
import type { TodoDocument } from '@/lib/validations/todo'

type Of<T extends Command['type']> = Extract<Command, { type: T }>

/** Reconcilia os pais dos itens removidos que ainda existem. */
function reconcileParentsOf(
  before: TodoDocument['items'],
  after: TodoDocument['items'],
  removedIds: readonly string[],
  ctx: Ctx
): TodoDocument['items'] {
  const parents = new Set<string>()
  for (const id of removedIds) {
    const parentId = before[id]?.parentId
    if (parentId && after[parentId]) parents.add(parentId)
  }
  return parents.size > 0 ? reconcileFrom(after, [...parents], ctx).items : after
}

/**
 * "Dispensar atrasados": remove as ocorrências abertas e vencidas — todas, ou só as mais antigas
 * que `olderThanDays`. Itens comuns atrasados nunca são removidos por aqui.
 */
export function dismissOverdue(doc: TodoDocument, cmd: Of<'dismissOverdue'>, ctx: Ctx): Outcome {
  const limit = cmd.olderThanDays === undefined ? ctx.today : addDays(ctx.today, -cmd.olderThanDays)
  const roots = Object.values(doc.items)
    .filter(
      (item) =>
        item.seriesId !== null &&
        !item.done &&
        item.occurrenceOn !== null &&
        item.occurrenceOn < limit
    )
    .map((item) => item.id)
  if (roots.length === 0) return fail('no-change')

  const removed = removeSubtrees(doc.items, roots)
  return {
    ok: true,
    items: reconcileParentsOf(doc.items, removed.items, removed.removedIds, ctx),
    events: [{ type: 'occurrences_dismissed', itemId: null, itemText: '', count: roots.length }],
  }
}

/** "Ordenar por prazo" num nível: reescreve o rank dos irmãos que mudam de lugar. */
export function sortByDue(doc: TodoDocument, cmd: Of<'sortByDue'>, ctx: Ctx): Outcome {
  if (cmd.parentId !== null && !doc.items[cmd.parentId]) return fail('not-found')
  const ranks = rankBySoonestDue(siblingsOf(doc.items, cmd.parentId))
  const ids = Object.keys(ranks)
  if (ids.length === 0) return fail('no-change')

  const items = { ...doc.items }
  for (const id of ids) items[id] = touch(items[id], { rank: ranks[id] }, ctx)
  return {
    ok: true,
    items,
    events: [
      {
        type: 'reordered',
        itemId: cmd.parentId,
        itemText: cmd.parentId === null ? '' : doc.items[cmd.parentId].text,
        count: ids.length,
      },
    ],
  }
}

/** Remove os itens de primeiro nível concluídos há mais de `olderThanDays` (com a subárvore). */
export function clearCompleted(doc: TodoDocument, cmd: Of<'clearCompleted'>, ctx: Ctx): Outcome {
  const limit = addDays(ctx.today, -cmd.olderThanDays)
  const roots = Object.values(doc.items)
    .filter(
      (item) =>
        item.parentId === null && item.done && item.completedOn !== null && item.completedOn < limit
    )
    .map((item) => item.id)
  if (roots.length === 0) return fail('no-change')

  const removed = removeSubtrees(doc.items, roots)
  return {
    ok: true,
    items: removed.items,
    events: [{ type: 'deleted', itemId: null, itemText: '', count: removed.removedIds.length }],
  }
}
