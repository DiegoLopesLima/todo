import { TODO_DEFAULT_PRIORITY, TODO_MAX_DEPTH, TODO_MAX_ITEMS } from '@/constants/todo'
import {
  checkText,
  dropSeriesInstances,
  fail,
  itemEvent,
  removeSubtrees,
  touch,
} from '@/lib/todo/commands/helpers'
import type { Command, Outcome } from '@/lib/todo/commands/types'
import { reconcileFrom, setDone } from '@/lib/todo/completion'
import { type Ctx, isoNow } from '@/lib/todo/ctx'
import { isRealCalendarDate } from '@/lib/todo/dates'
import { change } from '@/lib/todo/history'
import { needsRebalance, rankAtEndOfBand, rebalanceRanks } from '@/lib/todo/order'
import { canMove, depthOf, type Items, siblingsOf } from '@/lib/todo/tree'
import type { Item, TodoDocument } from '@/lib/validations/todo'

type Of<T extends Command['type']> = Extract<Command, { type: T }>

function datesOk(startsOn: string | null, dueOn: string | null): boolean {
  if (startsOn !== null && !isRealCalendarDate(startsOn)) return false
  if (dueOn !== null && !isRealCalendarDate(dueOn)) return false
  return startsOn === null || dueOn === null || startsOn <= dueOn
}

/** Cria um item no fim da sua faixa de prioridade, sob `parentId` (ou na raiz). */
export function createItem(doc: TodoDocument, cmd: Of<'createItem'>, ctx: Ctx): Outcome {
  const text = checkText(cmd.text)
  if (!text.ok) return fail(text.reason)
  const { items } = doc
  if (Object.keys(items).length >= TODO_MAX_ITEMS) return fail('limit')
  if (cmd.parentId !== null) {
    if (!items[cmd.parentId]) return fail('not-found')
    if (depthOf(items, cmd.parentId) + 1 > TODO_MAX_DEPTH - 1) return fail('depth')
  }
  const startsOn = cmd.startsOn ?? null
  const dueOn = cmd.dueOn ?? null
  if (!datesOk(startsOn, dueOn)) return fail('invalid-dates')

  const priority = cmd.priority ?? TODO_DEFAULT_PRIORITY
  const id = ctx.newId()
  const stamp = isoNow(ctx)
  const created: Item = {
    id,
    parentId: cmd.parentId,
    text: text.text,
    priority,
    rank: rankAtEndOfBand(siblingsOf(items, cmd.parentId), priority),
    done: false,
    completedAt: null,
    completedOn: null,
    startsOn,
    dueOn,
    seriesId: null,
    occurrenceOn: null,
    createdAt: stamp,
    updatedAt: stamp,
  }
  // Por quê: reconciliar — um item aberto novo reabre um pai que estava concluído.
  const reconciled = reconcileFrom({ ...items, [id]: created }, [id], ctx)
  return { ok: true, items: reconciled.items, events: [itemEvent('created', created)] }
}

/** Edita texto, prioridade e datas. Mudar a prioridade leva o item para o fim da nova faixa. */
export function editItem(doc: TodoDocument, cmd: Of<'editItem'>, ctx: Ctx): Outcome {
  const current = doc.items[cmd.id]
  if (!current) return fail('not-found')
  const { patch } = cmd
  const changes: Partial<Item> = {}
  const log: ReturnType<typeof change>[] = []

  if (patch.text !== undefined) {
    const text = checkText(patch.text)
    if (!text.ok) return fail(text.reason)
    if (text.text !== current.text) {
      changes.text = text.text
      log.push(change('text', current.text, text.text))
    }
  }
  if (patch.priority !== undefined && patch.priority !== current.priority) {
    const others = siblingsOf(doc.items, current.parentId).filter((s) => s.id !== current.id)
    changes.priority = patch.priority
    changes.rank = rankAtEndOfBand(others, patch.priority)
    log.push(change('priority', current.priority, patch.priority))
  }
  if (patch.startsOn !== undefined && patch.startsOn !== current.startsOn) {
    changes.startsOn = patch.startsOn
    log.push(change('startsOn', current.startsOn, patch.startsOn))
  }
  if (patch.dueOn !== undefined && patch.dueOn !== current.dueOn) {
    changes.dueOn = patch.dueOn
    log.push(change('dueOn', current.dueOn, patch.dueOn))
  }
  if (log.length === 0) return fail('no-change')

  const updated = touch(current, changes, ctx)
  if (!datesOk(updated.startsOn, updated.dueOn)) return fail('invalid-dates')
  return {
    ok: true,
    items: { ...doc.items, [cmd.id]: updated },
    events: [itemEvent('edited', updated, { changes: log })],
  }
}

/** Marca ou desmarca, propagando para filhos e pais. Cada item que mudou vira um evento. */
export function toggleDone(doc: TodoDocument, cmd: Of<'toggleDone'>, ctx: Ctx): Outcome {
  if (!doc.items[cmd.id]) return fail('not-found')
  const result = setDone(doc.items, cmd.id, cmd.done, ctx)
  if (result.changedIds.length === 0) return fail('no-change')
  return {
    ok: true,
    items: result.items,
    completedParents: result.completedParents,
    events: result.changedIds.map((id) =>
      itemEvent(cmd.done ? 'completed' : 'reopened', result.items[id])
    ),
  }
}

/** Move um item para um pai, prioridade e rank já resolvidos (arrastar, teclado ou "Mover para…"). */
export function moveItem(doc: TodoDocument, cmd: Of<'moveItem'>, ctx: Ctx): Outcome {
  const current = doc.items[cmd.id]
  if (!current) return fail('not-found')
  const check = canMove(doc.items, cmd.id, cmd.parentId)
  if (!check.ok) return fail(check.reason)

  const parentChanged = cmd.parentId !== current.parentId
  const priorityChanged = cmd.priority !== current.priority
  if (!parentChanged && !priorityChanged && cmd.rank === current.rank) return fail('no-change')

  const moved = touch(
    current,
    { parentId: cmd.parentId, priority: cmd.priority, rank: cmd.rank },
    ctx
  )
  let items: Items = { ...doc.items, [cmd.id]: moved }

  // Ranks cresceram demais (muitas inserções no mesmo ponto): reescreve a faixa. Sempre num objeto
  // novo — `siblingsOf` memoiza o índice por referência e mutar `items` o deixaria obsoleto.
  const siblings = siblingsOf(items, cmd.parentId)
  if (needsRebalance(siblings)) {
    const rebalanced = { ...items }
    for (const [id, rank] of Object.entries(rebalanceRanks(siblings))) {
      rebalanced[id] = touch(rebalanced[id], { rank }, ctx)
    }
    items = rebalanced
  }

  const reconciled = reconcileFrom(
    items,
    [cmd.id, ...(current.parentId ? [current.parentId] : [])],
    ctx
  )
  items = reconciled.items

  const event =
    parentChanged || priorityChanged
      ? itemEvent('moved', moved, {
          changes: [
            ...(parentChanged ? [change('parentId', current.parentId, cmd.parentId)] : []),
            ...(priorityChanged ? [change('priority', current.priority, cmd.priority)] : []),
          ],
        })
      : itemEvent('reordered', moved, { changes: [change('rank', current.rank, cmd.rank)] })
  return { ok: true, items, events: [event] }
}

/** Exclui o item e toda a subárvore; séries penduradas nela são removidas junto. */
export function deleteItem(doc: TodoDocument, cmd: Of<'deleteItem'>, ctx: Ctx): Outcome {
  const target = doc.items[cmd.id]
  if (!target) return fail('not-found')

  const removed = removeSubtrees(doc.items, [cmd.id])
  const removedSet = new Set(removed.removedIds)
  const orphanSeries = Object.values(doc.series).filter(
    (series) => series.parentId !== null && removedSet.has(series.parentId)
  )

  let items = removed.items
  let series = doc.series
  let cursors = doc.cursors
  if (orphanSeries.length > 0) {
    const ids = new Set(orphanSeries.map((entry) => entry.id))
    items = dropSeriesInstances(items, ids, false, ctx).items
    series = Object.fromEntries(Object.entries(series).filter(([id]) => !ids.has(id)))
    cursors = Object.fromEntries(Object.entries(cursors).filter(([id]) => !ids.has(id)))
  }
  if (target.parentId !== null && items[target.parentId]) {
    items = reconcileFrom(items, [target.parentId], ctx).items
  }

  const events = [
    itemEvent(
      'deleted',
      target,
      removed.removedIds.length > 1 ? { count: removed.removedIds.length } : {}
    ),
    ...orphanSeries.map((entry) => ({
      type: 'deleted' as const,
      itemId: null,
      itemText: entry.blueprint.text,
      seriesId: entry.id,
    })),
  ]
  return { ok: true, items, series, cursors, events }
}
