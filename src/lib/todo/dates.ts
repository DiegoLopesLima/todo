import { format } from 'date-fns'

import { ONE_DAY_IN_MS } from '@/constants/time'

/** Dia do calendário local no formato `YYYY-MM-DD` — sem horário nem fuso. */
export type DateKey = string

/** Dia da semana como `Date#getUTCDay`: 0 = domingo … 6 = sábado. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const MONTHS_IN_YEAR = 12

/** Os componentes numéricos de uma `DateKey`. */
export type DateParts = { year: number; month: number; day: number }

// Por quê: toda a aritmética de datas do módulo é feita em `Date.UTC` sobre inteiros, nunca em Date
// local. Uma data "flutuante" (o dia da pessoa, não um instante) não tem fuso: somar dias ou meses
// em hora local erraria nas viradas de horário de verão. O date-fns só entra para formatar.

/** Dias de um mês (`month` de 1 a 12), considerando ano bissexto. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Decompõe uma `DateKey`; devolve `null` se o formato ou o dia do calendário forem inválidos. */
export function parseDateKey(key: string): DateParts | null {
  const match = DATE_KEY_PATTERN.exec(key)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > MONTHS_IN_YEAR || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

/** `true` se a string é um dia real do calendário (rejeita 31/02, mês 13, formato errado). */
export function isRealCalendarDate(key: string): boolean {
  return parseDateKey(key) !== null
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

/** Monta a `DateKey` de componentes já válidos. */
export function fromParts({ year, month, day }: DateParts): DateKey {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

function mustParse(key: DateKey): DateParts {
  const parts = parseDateKey(key)
  if (!parts) throw new RangeError(`Invalid date key: ${key}`)
  return parts
}

function toUtcMs(key: DateKey): number {
  const { year, month, day } = mustParse(key)
  return Date.UTC(year, month - 1, day)
}

function fromUtcMs(ms: number): DateKey {
  const date = new Date(ms)
  return fromParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

/** O dia local de um instante — a única ponte entre `Date` e `DateKey`. */
export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Um `Date` local ao meio-dia do dia — para formatar com date-fns. Meio-dia evita que um salto de
 * horário de verão à meia-noite empurre o dia.
 */
export function toLocalDate(key: DateKey): Date {
  const { year, month, day } = mustParse(key)
  return new Date(year, month - 1, day, 12)
}

/** Soma (ou subtrai) dias inteiros. */
export function addDays(key: DateKey, days: number): DateKey {
  return fromUtcMs(toUtcMs(key) + days * ONE_DAY_IN_MS)
}

/** Soma meses mantendo o dia, ou o último dia do mês se o dia não existir (31 de jan + 1 mês = 28/29 fev). */
export function addMonths(key: DateKey, months: number): DateKey {
  const { year, month, day } = mustParse(key)
  const index = year * MONTHS_IN_YEAR + (month - 1) + months
  const targetYear = Math.floor(index / MONTHS_IN_YEAR)
  const targetMonth = (index % MONTHS_IN_YEAR) + 1
  return fromParts({
    year: targetYear,
    month: targetMonth,
    day: Math.min(day, daysInMonth(targetYear, targetMonth)),
  })
}

/** Dias inteiros de `from` até `to` (negativo se `to` for anterior). */
export function diffInDays(from: DateKey, to: DateKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / ONE_DAY_IN_MS)
}

/** Dia da semana: 0 = domingo … 6 = sábado. */
export function weekdayOf(key: DateKey): Weekday {
  return new Date(toUtcMs(key)).getUTCDay() as Weekday
}

/** Último dia do mês da data. */
export function endOfMonth(key: DateKey): DateKey {
  const { year, month } = mustParse(key)
  return fromParts({ year, month, day: daysInMonth(year, month) })
}

/** O maior de dois dias. */
export function maxDateKey(a: DateKey, b: DateKey): DateKey {
  return a >= b ? a : b
}

/** O menor de dois dias. */
export function minDateKey(a: DateKey, b: DateKey): DateKey {
  return a <= b ? a : b
}
