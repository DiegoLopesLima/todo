import { TODO_DEFAULT_PRIORITY, TODO_MAX_DEPTH } from '@/constants/todo'
import type { Priority } from '@/enums/todo'
import {
  blueprintOf,
  checkText,
  dropSeriesInstances,
  fail,
  removeSubtrees,
  touch,
} from '@/lib/todo/commands/helpers'
import type { Command, Outcome } from '@/lib/todo/commands/types'
import { reconcileFrom } from '@/lib/todo/completion'
import { type Ctx, isoNow } from '@/lib/todo/ctx'
import { addDays, type DateKey, isRealCalendarDate } from '@/lib/todo/dates'
import { change, type EventDraft } from '@/lib/todo/history'
import { blueprintHeight, materializeDue } from '@/lib/todo/materialize'
import { rankAtEndOfBand } from '@/lib/todo/order'
import { depthOf, descendantsOf, type Items, siblingsOf } from '@/lib/todo/tree'
import {
  type Blueprint,
  blueprintSchema,
  type Recurrence,
  recurrenceSchema,
  type Series,
  type TodoDocument,
} from '@/lib/validations/todo'

type Of<T extends Command['type']> = Extract<Command, { type: T }>

type SeedParams = {
  text: string
  priority: Priority
  parentId: string | null
  rule: Recurrence
  startsOn: DateKey
  endsOn: DateKey | null
  children: Blueprint[]
}

function datesOk(startsOn: DateKey, endsOn: DateKey | null): boolean {
  if (!isRealCalendarDate(startsOn)) return false
  return endsOn === null || (isRealCalendarDate(endsOn) && endsOn >= startsOn)
}

/** Eventos de sistema para as ocorrências que acabaram de ser geradas. */
function generationEvents(
  seriesId: string,
  created: readonly string[],
  skippedCount: number,
  items: Items,
  text: string
): EventDraft[] {
  const events: EventDraft[] = created.map((id) => ({
    type: 'occurrence_created',
    itemId: id,
    itemText: items[id].text,
    seriesId,
    origin: 'system',
  }))
  if (skippedCount > 0) {
    events.push({
      type: 'occurrences_skipped',
      itemId: null,
      itemText: text,
      seriesId,
      count: skippedCount,
      origin: 'system',
    })
  }
  return events
}

/** Cria a série e já gera as ocorrências devidas até hoje. */
function seedSeries(doc: TodoDocument, params: SeedParams, ctx: Ctx): Outcome {
  const text = checkText(params.text)
  if (!text.ok) return fail(text.reason)
  const blueprint: Blueprint = {
    text: text.text,
    priority: params.priority,
    children: params.children,
  }
  if (!blueprintSchema.safeParse(blueprint).success) return fail('empty-text')
  if (params.parentId !== null && !doc.items[params.parentId]) return fail('not-found')
  const parentDepth = params.parentId === null ? -1 : depthOf(doc.items, params.parentId)
  if (parentDepth + 1 + blueprintHeight(blueprint) > TODO_MAX_DEPTH - 1) return fail('depth')
  if (!recurrenceSchema.safeParse(params.rule).success) return fail('invalid-rule')
  if (!datesOk(params.startsOn, params.endsOn)) return fail('invalid-dates')

  const id = ctx.newId()
  const stamp = isoNow(ctx)
  const series: Series = {
    id,
    rule: params.rule,
    startsOn: params.startsOn,
    endsOn: params.endsOn,
    parentId: params.parentId,
    blueprint,
    createdAt: stamp,
    updatedAt: stamp,
  }
  // Por quê: gera só as ocorrências DESTA série — as outras têm seu próprio ritmo, e misturá-las
  // no mesmo passo de desfazer faria "desfazer" apagar ocorrências de séries que nada têm a ver.
  const generated = materializeDue({ ...doc, series: { [id]: series } }, ctx)
  const skipped = generated.skipped.reduce((total, entry) => total + entry.count, 0)
  return {
    ok: true,
    items: generated.doc.items,
    series: { ...doc.series, [id]: series },
    cursors: generated.doc.cursors,
    events: [
      { type: 'series_created', itemId: null, itemText: blueprint.text, seriesId: id },
      ...generationEvents(id, generated.created, skipped, generated.doc.items, blueprint.text),
    ],
  }
}

export function createSeries(doc: TodoDocument, cmd: Of<'createSeries'>, ctx: Ctx): Outcome {
  return seedSeries(
    doc,
    {
      text: cmd.text,
      priority: cmd.priority ?? TODO_DEFAULT_PRIORITY,
      parentId: cmd.parentId,
      rule: cmd.rule,
      startsOn: cmd.startsOn,
      endsOn: cmd.endsOn ?? null,
      children: cmd.children ?? [],
    },
    ctx
  )
}

/** Transforma um item comum (e seus subitens) numa série: o item vira o molde das ocorrências. */
export function makeRecurring(doc: TodoDocument, cmd: Of<'makeRecurring'>, ctx: Ctx): Outcome {
  const item = doc.items[cmd.id]
  if (!item) return fail('not-found')
  const subtree = [cmd.id, ...descendantsOf(doc.items, cmd.id)]
  const inSubtree = new Set(subtree)
  const hasSeriesInside =
    subtree.some((id) => doc.items[id].seriesId !== null) ||
    Object.values(doc.series).some((s) => s.parentId !== null && inSubtree.has(s.parentId))
  if (hasSeriesInside) return fail('invalid-target')

  const blueprint = blueprintOf(doc.items, cmd.id)
  let items = removeSubtrees(doc.items, [cmd.id]).items
  if (item.parentId !== null) items = reconcileFrom(items, [item.parentId], ctx).items
  return seedSeries(
    { ...doc, items },
    {
      text: blueprint.text,
      priority: blueprint.priority,
      parentId: item.parentId,
      rule: cmd.rule,
      startsOn: cmd.startsOn,
      endsOn: cmd.endsOn ?? null,
      children: blueprint.children,
    },
    ctx
  )
}

/**
 * Edita uma série. Texto e prioridade alteram o molde (e, com `fromDate`, as ocorrências abertas
 * daquela data em diante); mudar a regra recomeça a contagem no primeiro dia ainda não gerado.
 */
export function editSeries(doc: TodoDocument, cmd: Of<'editSeries'>, ctx: Ctx): Outcome {
  const current = doc.series[cmd.id]
  if (!current) return fail('not-found')
  const { patch } = cmd
  const log: ReturnType<typeof change>[] = []
  let blueprint = current.blueprint
  let { rule, startsOn, endsOn, parentId } = current

  if (patch.text !== undefined) {
    const text = checkText(patch.text)
    if (!text.ok) return fail(text.reason)
    if (text.text !== blueprint.text) {
      log.push(change('text', blueprint.text, text.text))
      blueprint = { ...blueprint, text: text.text }
    }
  }
  if (patch.priority !== undefined && patch.priority !== blueprint.priority) {
    log.push(change('priority', blueprint.priority, patch.priority))
    blueprint = { ...blueprint, priority: patch.priority }
  }
  if (patch.rule !== undefined && JSON.stringify(patch.rule) !== JSON.stringify(rule)) {
    if (!recurrenceSchema.safeParse(patch.rule).success) return fail('invalid-rule')
    log.push(change('rule', rule.freq, patch.rule.freq))
    rule = patch.rule
    const generatedUntil = doc.cursors[cmd.id]
    if (generatedUntil) startsOn = addDays(generatedUntil, 1)
  }
  if (patch.endsOn !== undefined && patch.endsOn !== endsOn) {
    log.push(change('endsOn', endsOn, patch.endsOn))
    endsOn = patch.endsOn
  }
  if (patch.parentId !== undefined && patch.parentId !== parentId) {
    if (patch.parentId !== null) {
      if (!doc.items[patch.parentId]) return fail('not-found')
      if (
        depthOf(doc.items, patch.parentId) + 1 + blueprintHeight(blueprint) >
        TODO_MAX_DEPTH - 1
      ) {
        return fail('depth')
      }
    }
    log.push(change('parentId', parentId, patch.parentId))
    parentId = patch.parentId
  }
  if (log.length === 0) return fail('no-change')
  if (!datesOk(startsOn, endsOn)) return fail('invalid-dates')

  const updated: Series = {
    ...current,
    rule,
    startsOn,
    endsOn,
    parentId,
    blueprint,
    updatedAt: isoNow(ctx),
  }

  let items = doc.items
  const retitled = patch.text !== undefined || patch.priority !== undefined
  const { fromDate } = cmd
  if (fromDate !== undefined && retitled) {
    const open = Object.values(items)
      .filter(
        (item) =>
          item.seriesId === cmd.id &&
          !item.done &&
          item.occurrenceOn !== null &&
          item.occurrenceOn >= fromDate
      )
      .sort((a, b) => ((a.occurrenceOn ?? '') < (b.occurrenceOn ?? '') ? -1 : 1))
    for (const instance of open) {
      const changes: Partial<typeof instance> = { text: blueprint.text }
      if (blueprint.priority !== instance.priority) {
        const others = siblingsOf(items, instance.parentId).filter((s) => s.id !== instance.id)
        changes.priority = blueprint.priority
        changes.rank = rankAtEndOfBand(others, blueprint.priority)
      }
      items = { ...items, [instance.id]: touch(instance, changes, ctx) }
    }
  }

  return {
    ok: true,
    items,
    series: { ...doc.series, [cmd.id]: updated },
    events: [
      {
        type: 'series_changed',
        itemId: null,
        itemText: blueprint.text,
        seriesId: cmd.id,
        changes: log,
      },
    ],
  }
}

/** Copia a estrutura de subitens de uma ocorrência para o molde, valendo para as próximas. */
export function applyStructureToSeries(
  doc: TodoDocument,
  cmd: Of<'applyStructureToSeries'>,
  ctx: Ctx
): Outcome {
  const instance = doc.items[cmd.itemId]
  if (!instance) return fail('not-found')
  const series = instance.seriesId === null ? undefined : doc.series[instance.seriesId]
  if (!series) return fail('invalid-target')

  const children = blueprintOf(doc.items, instance.id).children
  const next = { ...series.blueprint, children }
  const parentDepth = series.parentId === null ? -1 : depthOf(doc.items, series.parentId)
  if (parentDepth + 1 + blueprintHeight(next) > TODO_MAX_DEPTH - 1) return fail('depth')
  if (JSON.stringify(next) === JSON.stringify(series.blueprint)) return fail('no-change')

  return {
    ok: true,
    series: { ...doc.series, [series.id]: { ...series, blueprint: next, updatedAt: isoNow(ctx) } },
    events: [{ type: 'series_changed', itemId: null, itemText: next.text, seriesId: series.id }],
  }
}

/** Encerra a série: nada novo é gerado e o que já foi concluído permanece. */
export function endSeries(doc: TodoDocument, cmd: Of<'endSeries'>, ctx: Ctx): Outcome {
  const series = doc.series[cmd.id]
  if (!series) return fail('not-found')
  const yesterday = addDays(ctx.today, -1)
  // Uma série que nem começou não tem o que encerrar: some, como se nunca tivesse existido.
  if (series.startsOn > yesterday)
    return deleteSeries(doc, { type: 'deleteSeries', id: cmd.id, deleteDone: false }, ctx)
  if (series.endsOn !== null && series.endsOn <= yesterday) return fail('no-change')
  return {
    ok: true,
    series: { ...doc.series, [cmd.id]: { ...series, endsOn: yesterday, updatedAt: isoNow(ctx) } },
    events: [
      { type: 'series_ended', itemId: null, itemText: series.blueprint.text, seriesId: cmd.id },
    ],
  }
}

/** Exclui a série e as ocorrências abertas; as concluídas ficam como itens comuns (ou saem, se pedido). */
export function deleteSeries(doc: TodoDocument, cmd: Of<'deleteSeries'>, ctx: Ctx): Outcome {
  const series = doc.series[cmd.id]
  if (!series) return fail('not-found')
  const dropped = dropSeriesInstances(doc.items, new Set([cmd.id]), cmd.deleteDone, ctx)
  const parents = new Set<string>()
  for (const id of dropped.removedIds) {
    const parentId = doc.items[id]?.parentId
    if (parentId && dropped.items[parentId]) parents.add(parentId)
  }
  const items =
    parents.size > 0 ? reconcileFrom(dropped.items, [...parents], ctx).items : dropped.items

  const without = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => id !== cmd.id))
  return {
    ok: true,
    items,
    series: without(doc.series),
    cursors: without(doc.cursors),
    events: [
      {
        type: 'deleted',
        itemId: null,
        itemText: series.blueprint.text,
        seriesId: cmd.id,
        count: dropped.removedIds.length,
      },
    ],
  }
}
