import {
  addDays,
  type DateKey,
  daysInMonth,
  diffInDays,
  fromParts,
  maxDateKey,
  parseDateKey,
  weekdayOf,
} from '@/lib/todo/dates'
import type { Recurrence } from '@/lib/validations/todo'

const DAYS_IN_WEEK = 7
const MONTHS_IN_YEAR = 12
const FEBRUARY = 2
const LEAP_DAY = 29

/** Teto de datas devolvidas por consulta — protege contra um intervalo absurdo (relógio adiantado décadas). */
export const MAX_OCCURRENCES_PER_QUERY = 5000

/** Quão longe `nextOccurrence` procura: o maior intervalo suportado (10 anos) com folga. */
const NEXT_OCCURRENCE_HORIZON_DAYS = 3700

function startOfWeek(key: DateKey, weekStartsOn: 0 | 1): DateKey {
  const offset = (weekdayOf(key) - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK
  return addDays(key, -offset)
}

function monthIndexOf(key: DateKey): number {
  const parts = parseDateKey(key)
  if (!parts) throw new RangeError(`Invalid date key: ${key}`)
  return parts.year * MONTHS_IN_YEAR + (parts.month - 1)
}

function ceilToMultiple(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

type Collector = { dates: DateKey[]; from: DateKey; to: DateKey; anchor: DateKey; limit: number }

/** Acrescenta a data se ela está na janela pedida; devolve `false` quando o limite foi atingido. */
function collect(c: Collector, date: DateKey): boolean {
  if (date >= c.anchor && date >= c.from && date <= c.to) c.dates.push(date)
  return c.dates.length < c.limit
}

function collectDaily(rule: Extract<Recurrence, { freq: 'daily' }>, c: Collector): void {
  const gap = Math.max(0, diffInDays(c.anchor, c.from))
  const first = ceilToMultiple(gap, rule.interval)
  for (let date = addDays(c.anchor, first); date <= c.to; date = addDays(date, rule.interval)) {
    if (!collect(c, date)) return
  }
}

function collectWeekly(rule: Extract<Recurrence, { freq: 'weekly' }>, c: Collector): void {
  const firstWeekStart = startOfWeek(c.anchor, rule.weekStartsOn)
  const positions = rule.weekdays
    .map((weekday) => (weekday - rule.weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK)
    .sort((a, b) => a - b)
  const fromWeek = Math.max(0, Math.floor(diffInDays(firstWeekStart, c.from) / DAYS_IN_WEEK))
  let week = ceilToMultiple(fromWeek, rule.interval)
  for (;;) {
    const weekStart = addDays(firstWeekStart, week * DAYS_IN_WEEK)
    if (weekStart > c.to) return
    for (const position of positions) {
      if (!collect(c, addDays(weekStart, position))) return
    }
    week += rule.interval
  }
}

function collectMonthly(rule: Extract<Recurrence, { freq: 'monthly' }>, c: Collector): void {
  const anchorIndex = monthIndexOf(c.anchor)
  const fromOffset = Math.max(0, monthIndexOf(c.from) - anchorIndex)
  let offset = ceilToMultiple(fromOffset, rule.interval)
  for (;;) {
    const index = anchorIndex + offset
    const year = Math.floor(index / MONTHS_IN_YEAR)
    const month = (index % MONTHS_IN_YEAR) + 1
    if (fromParts({ year, month, day: 1 }) > c.to) return
    const lastDay = daysInMonth(year, month)
    const day = rule.day === 'last' ? lastDay : Math.min(rule.day, lastDay)
    if (!collect(c, fromParts({ year, month, day }))) return
    offset += rule.interval
  }
}

function collectYearly(rule: Extract<Recurrence, { freq: 'yearly' }>, c: Collector): void {
  const anchor = parseDateKey(c.anchor)
  const from = parseDateKey(c.from)
  if (!anchor || !from) return
  const fromOffset = Math.max(0, from.year - anchor.year)
  let offset = ceilToMultiple(fromOffset, rule.interval)
  for (;;) {
    const year = anchor.year + offset
    if (fromParts({ year, month: 1, day: 1 }) > c.to) return
    // 29 de fevereiro num ano não bissexto cai em 28 de fevereiro.
    const day =
      anchor.month === FEBRUARY && anchor.day === LEAP_DAY
        ? Math.min(LEAP_DAY, daysInMonth(year, FEBRUARY))
        : anchor.day
    if (!collect(c, fromParts({ year, month: anchor.month, day }))) return
    offset += rule.interval
  }
}

/**
 * Datas previstas por `rule` entre `from` e `to` (inclusivos), em ordem crescente, a partir da
 * âncora (`anchor`, o início da série). Nunca devolve data anterior à âncora.
 */
export function occurrencesInRange(
  rule: Recurrence,
  anchor: DateKey,
  from: DateKey,
  to: DateKey,
  limit: number = MAX_OCCURRENCES_PER_QUERY
): DateKey[] {
  const c: Collector = { dates: [], from: maxDateKey(from, anchor), to, anchor, limit }
  if (c.from > to) return c.dates
  switch (rule.freq) {
    case 'daily':
      collectDaily(rule, c)
      break
    case 'weekly':
      collectWeekly(rule, c)
      break
    case 'monthly':
      collectMonthly(rule, c)
      break
    case 'yearly':
      collectYearly(rule, c)
      break
  }
  return c.dates
}

/** A primeira data prevista em ou depois de `from` (`null` se nenhuma no horizonte). */
export function firstOccurrenceOnOrAfter(
  rule: Recurrence,
  anchor: DateKey,
  from: DateKey
): DateKey | null {
  const start = maxDateKey(from, anchor)
  const [first] = occurrencesInRange(
    rule,
    anchor,
    start,
    addDays(start, NEXT_OCCURRENCE_HORIZON_DAYS),
    1
  )
  return first ?? null
}

/** A primeira data prevista estritamente depois de `after`. */
export function nextOccurrence(rule: Recurrence, anchor: DateKey, after: DateKey): DateKey | null {
  return firstOccurrenceOnOrAfter(rule, anchor, addDays(after, 1))
}
