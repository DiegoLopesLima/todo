import { format } from 'date-fns'

import { ONE_DAY_IN_MS } from '@/constants/time'
import { getDateLocale } from '@/lib/date-locale'
import { type DateKey, diffInDays, parseDateKey, toLocalDate } from '@/lib/todo/dates'

/** Até quantos dias de distância o rótulo mostra o dia da semana em vez da data. */
const WEEKDAY_WINDOW_DAYS = 6

/**
 * Rótulo curto de um dia, relativo a hoje: "hoje", "amanhã", "ontem"; dentro de uma semana, o dia da
 * semana ("qua., 12 mar."); fora disso a data, com o ano se não for o corrente.
 */
export function formatDayLabel(day: DateKey, today: DateKey, locale: string): string {
  const diff = diffInDays(today, day)
  const dateLocale = getDateLocale(locale)
  if (Math.abs(diff) <= 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diff, 'day')
  }
  const date = toLocalDate(day)
  if (Math.abs(diff) <= WEEKDAY_WINDOW_DAYS) {
    return format(date, 'EEE, d MMM', { locale: dateLocale })
  }
  const sameYear = parseDateKey(day)?.year === parseDateKey(today)?.year
  return format(date, sameYear ? 'd MMM' : 'd MMM yyyy', { locale: dateLocale })
}

/** Um domingo qualquer: a base para obter os nomes dos dias da semana no idioma da pessoa. */
const SUNDAY = new Date(2026, 2, 8, 12)
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

/** Nome curto e longo de cada dia da semana (0 = domingo), no idioma dado. */
export function weekdayLabels(locale: string): { short: string; long: string }[] {
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' })
  return WEEKDAYS.map((day) => {
    const date = new Date(SUNDAY.getTime() + day * ONE_DAY_IN_MS)
    return { short: short.format(date), long: long.format(date) }
  })
}

/** Data longa para o histórico e para os detalhes ("10 de março de 2026"). */
export function formatDayLong(day: DateKey, locale: string): string {
  return format(toLocalDate(day), 'PPP', { locale: getDateLocale(locale) })
}
