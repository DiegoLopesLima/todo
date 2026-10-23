import { generateNKeysBetween } from 'fractional-indexing'

import {
  TODO_MAX_CATCHUP_PER_RUN,
  TODO_MAX_CATCHUP_PER_SERIES,
  TODO_MAX_DEPTH,
  TODO_MAX_ITEMS,
} from '@/constants/todo'
import { reconcileFrom } from '@/lib/todo/completion'
import { type Ctx, isoNow } from '@/lib/todo/ctx'
import { addDays, type DateKey, maxDateKey, minDateKey } from '@/lib/todo/dates'
import { occurrenceChildId, occurrenceId } from '@/lib/todo/ids'
import { rankAtEndOfBand, rankBetween } from '@/lib/todo/order'
import { occurrencesInRange } from '@/lib/todo/recurrence'
import { depthOf, type Items, siblingsOf } from '@/lib/todo/tree'
import type { Blueprint, Item, Series, TodoDocument } from '@/lib/validations/todo'

/** Resultado de gerar as ocorrências que faltam. */
export type MaterializeResult = {
  doc: TodoDocument
  /** Ids das ocorrências (raízes) criadas, em ordem de data. */
  created: string[]
  /** Por série, quantas ocorrências devidas ficaram sem linha por causa dos tetos. */
  skipped: { seriesId: string; count: number }[]
}

/** Altura (níveis abaixo da raiz) de um molde. */
export function blueprintHeight(blueprint: Blueprint): number {
  let height = 0
  for (const child of blueprint.children) height = Math.max(height, 1 + blueprintHeight(child))
  return height
}

function blankItem(
  id: string,
  parentId: string | null,
  blueprint: Blueprint,
  rank: string,
  ctx: Ctx
): Item {
  const stamp = isoNow(ctx)
  return {
    id,
    parentId,
    text: blueprint.text,
    priority: blueprint.priority,
    rank,
    done: false,
    completedAt: null,
    completedOn: null,
    startsOn: null,
    dueOn: null,
    seriesId: null,
    occurrenceOn: null,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

/** Cria os filhos do molde, com ids determinísticos numerados em pré-ordem. */
function addBlueprintChildren(
  target: Items,
  parentId: string,
  children: readonly Blueprint[],
  instanceId: string,
  counter: { n: number },
  ctx: Ctx
): void {
  const ranks = generateNKeysBetween(null, null, children.length)
  children.forEach((child, index) => {
    const id = occurrenceChildId(instanceId, counter.n++)
    target[id] = blankItem(id, parentId, child, ranks[index], ctx)
    addBlueprintChildren(target, id, child.children, instanceId, counter, ctx)
  })
}

/**
 * Gera as ocorrências devidas de cada série até hoje.
 *
 * Idempotente: o id da ocorrência é `${série}:${data}`, então rodar de novo (ou em duas abas) nunca
 * duplica; o cursor só avança. Se o app ficou fechado por muito tempo, cada série gera no máximo
 * `TODO_MAX_CATCHUP_PER_SERIES` ocorrências (as mais recentes) e a execução toda no máximo
 * `TODO_MAX_CATCHUP_PER_RUN`; o excedente é devolvido em `skipped`.
 */
export function materializeDue(doc: TodoDocument, ctx: Ctx): MaterializeResult {
  const seriesList = Object.values(doc.series).sort((a, b) => (a.id < b.id ? -1 : 1))
  const nextItems: Items = { ...doc.items }
  const nextCursors = { ...doc.cursors }
  const created: string[] = []
  const skipped: MaterializeResult['skipped'] = []
  const lastRankByBand = new Map<string, string>()
  const touchedParents = new Set<string>()
  let runBudget = TODO_MAX_CATCHUP_PER_RUN
  let itemCount = Object.keys(doc.items).length

  for (const series of seriesList) {
    const end: DateKey = minDateKey(ctx.today, series.endsOn ?? ctx.today)
    const cursor = doc.cursors[series.id] ?? addDays(series.startsOn, -1)
    const from = addDays(cursor, 1)
    if (from > end) continue

    const due = occurrencesInRange(series.rule, series.startsOn, from, end)
    const allowed = Math.min(TODO_MAX_CATCHUP_PER_SERIES, runBudget)
    const wanted = due.slice(Math.max(0, due.length - allowed))
    let makeCount = 0

    const parentId = resolveParent(doc.items, series)
    const instanceSize = 1 + countBlueprint(series.blueprint)
    for (const date of wanted) {
      const id = occurrenceId(series.id, date)
      if (nextItems[id]) continue
      if (itemCount + instanceSize > TODO_MAX_ITEMS) break
      const bandKey = `${parentId ?? ''}|${series.blueprint.priority}`
      const previous = lastRankByBand.get(bandKey)
      const rank =
        previous === undefined
          ? rankAtEndOfBand(siblingsOf(doc.items, parentId), series.blueprint.priority)
          : rankBetween(previous, null)
      lastRankByBand.set(bandKey, rank)

      const instance: Item = {
        ...blankItem(id, parentId, series.blueprint, rank, ctx),
        startsOn: date,
        dueOn: date,
        seriesId: series.id,
        occurrenceOn: date,
      }
      nextItems[id] = instance
      addBlueprintChildren(nextItems, id, series.blueprint.children, id, { n: 0 }, ctx)
      itemCount += instanceSize
      makeCount++
      created.push(id)
      if (parentId !== null) touchedParents.add(parentId)
    }

    runBudget -= makeCount
    // Só conta como "pulada" a data devida que continua sem item — as que já existiam não faltam.
    const missing =
      due.filter((date) => !doc.items[occurrenceId(series.id, date)]).length - makeCount
    if (missing > 0) skipped.push({ seriesId: series.id, count: missing })
    nextCursors[series.id] = maxDateKey(cursor, end)
  }

  const cursorsChanged = Object.keys(nextCursors).some((id) => nextCursors[id] !== doc.cursors[id])
  if (created.length === 0 && !cursorsChanged) return { doc, created, skipped }

  const reconciled =
    touchedParents.size > 0 ? reconcileFrom(nextItems, [...touchedParents], ctx).items : nextItems
  return { doc: { ...doc, items: reconciled, cursors: nextCursors }, created, skipped }
}

function countBlueprint(blueprint: Blueprint): number {
  return blueprint.children.reduce((total, child) => total + 1 + countBlueprint(child), 0)
}

/** Onde as ocorrências entram: no pai da série; na raiz se o pai sumiu ou o molde não cabe mais fundo. */
function resolveParent(items: Items, series: Series): string | null {
  const parentId = series.parentId
  if (parentId === null || !items[parentId]) return null
  const fits =
    depthOf(items, parentId) + 1 + blueprintHeight(series.blueprint) <= TODO_MAX_DEPTH - 1
  return fits ? parentId : null
}
