import { ONE_DAY_IN_MS } from '@/constants/time'
import {
  TODO_HISTORY_MAX_AGE_DAYS,
  TODO_HISTORY_MAX_CHANGES,
  TODO_HISTORY_MAX_EVENTS,
  TODO_HISTORY_MERGE_WINDOW_MS,
  TODO_HISTORY_TEXT_LENGTH,
} from '@/constants/todo'
import type { HistoryEventType, HistoryOrigin } from '@/enums/todo'
import type { Ctx } from '@/lib/todo/ctx'
import { type DateKey, toDateKey } from '@/lib/todo/dates'
import { normalizeSearch } from '@/lib/todo/filters'
import type { HistoryEvent } from '@/lib/validations/todo'

const MAX_CHANGE_VALUE_LENGTH = 200

/** Os tipos de evento agrupados nas categorias do filtro do histórico. Cada tipo está em uma só. */
export const HISTORY_CATEGORIES = {
  done: ['completed', 'reopened'],
  edit: ['created', 'edited', 'moved', 'reordered', 'deleted'],
  repeat: [
    'occurrence_created',
    'occurrences_skipped',
    'occurrences_dismissed',
    'series_created',
    'series_changed',
    'series_ended',
  ],
  data: ['imported', 'undone', 'redone'],
} as const satisfies Record<string, readonly HistoryEventType[]>

export type HistoryCategory = keyof typeof HISTORY_CATEGORIES

/** Um evento ainda sem id, carimbo e origem — o reducer descreve, o `buildEvent` completa. */
export type EventDraft = Omit<HistoryEvent, 'id' | 'at' | 'origin'> & { origin?: HistoryOrigin }

export type HistoryFilter = {
  types?: readonly HistoryEventType[]
  itemId?: string
  /** Primeiro dia (inclusivo), no fuso local. */
  from?: DateKey
  /** Último dia (inclusivo), no fuso local. */
  to?: DateKey
  origin?: HistoryOrigin
  /** Texto contido no texto do item no momento do evento (sem acento nem caixa). */
  text?: string
}

type ChangeValue = string | number | boolean | null

/** Corta o texto guardado num evento para o limite do histórico. */
export function truncateText(text: string, max: number = TODO_HISTORY_TEXT_LENGTH): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** Uma mudança de campo para o detalhe de um evento "editado". */
export function change(field: string, from: ChangeValue, to: ChangeValue) {
  const cut = (value: ChangeValue) =>
    typeof value === 'string' ? truncateText(value, MAX_CHANGE_VALUE_LENGTH) : value
  return { field, from: cut(from), to: cut(to) }
}

/** Completa um rascunho de evento com id, instante e origem (padrão: a pessoa). */
export function buildEvent(draft: EventDraft, ctx: Ctx): HistoryEvent {
  const { origin, changes, ...rest } = draft
  return {
    ...rest,
    ...(changes ? { changes: changes.slice(0, TODO_HISTORY_MAX_CHANGES) } : {}),
    itemText: truncateText(draft.itemText),
    id: ctx.newId(),
    at: ctx.now.toISOString(),
    origin: origin ?? 'user',
  }
}

function canMerge(
  previous: HistoryEvent | undefined,
  next: HistoryEvent
): previous is HistoryEvent {
  return (
    previous !== undefined &&
    previous.type === 'reordered' &&
    next.type === 'reordered' &&
    previous.itemId === next.itemId &&
    new Date(next.at).getTime() - new Date(previous.at).getTime() <= TODO_HISTORY_MERGE_WINDOW_MS
  )
}

/**
 * Acrescenta eventos ao fim do histórico. Reordenações seguidas do mesmo item dentro da janela viram
 * um só evento (do primeiro "de" ao último "para"), e a poda por idade e por quantidade remove os
 * mais antigos — a única forma de um registro sumir.
 */
export function appendHistory(
  history: readonly HistoryEvent[],
  events: readonly HistoryEvent[],
  ctx: Ctx
): HistoryEvent[] {
  const next = [...history]
  for (const event of events) {
    const previous = next.at(-1)
    if (canMerge(previous, event)) {
      const first = previous.changes?.[0]
      const last = event.changes?.[0]
      next[next.length - 1] = {
        ...previous,
        at: event.at,
        changes: first && last ? [{ ...first, to: last.to }] : (event.changes ?? previous.changes),
      }
    } else {
      next.push(event)
    }
  }
  return prune(next, ctx)
}

function prune(history: HistoryEvent[], ctx: Ctx): HistoryEvent[] {
  const cutoff = new Date(
    ctx.now.getTime() - TODO_HISTORY_MAX_AGE_DAYS * ONE_DAY_IN_MS
  ).toISOString()
  const recent = history.filter((event) => event.at >= cutoff)
  return recent.length > TODO_HISTORY_MAX_EVENTS
    ? recent.slice(recent.length - TODO_HISTORY_MAX_EVENTS)
    : recent
}

/** Os eventos que passam no filtro, do mais novo para o mais antigo. */
export function filterHistory(
  history: readonly HistoryEvent[],
  filter: HistoryFilter
): HistoryEvent[] {
  const { types, itemId, from, to, origin } = filter
  const needle = filter.text ? normalizeSearch(filter.text) : ''
  return history
    .filter((event) => {
      if (needle !== '' && !normalizeSearch(event.itemText).includes(needle)) return false
      if (types && types.length > 0 && !types.includes(event.type)) return false
      if (itemId !== undefined && event.itemId !== itemId) return false
      if (origin !== undefined && event.origin !== origin) return false
      if (from !== undefined || to !== undefined) {
        const day = toDateKey(new Date(event.at))
        if (from !== undefined && day < from) return false
        if (to !== undefined && day > to) return false
      }
      return true
    })
    .reverse()
}

/** Ids de eventos que hoje estão desfeitos: o último "desfeito" ainda não foi seguido de "refeito". */
export function undoneEventIds(history: readonly HistoryEvent[]): Set<string> {
  const undone = new Set<string>()
  for (const event of history) {
    if (!event.refEventId) continue
    if (event.type === 'undone') undone.add(event.refEventId)
    else if (event.type === 'redone') undone.delete(event.refEventId)
  }
  return undone
}
