import { TODO_CLEARED_DAYS_RETENTION } from '@/constants/todo'
import { addDays, type DateKey, diffInDays } from '@/lib/todo/dates'
import { buildVisibleRows } from '@/lib/todo/filters'
import { childIds, type Items } from '@/lib/todo/tree'

/** Contagem do anel do dia: folhas concluídas e abertas da visão Hoje. */
export type DayScope = { done: number; open: number }

export type Streak = {
  /** Dias zerados seguidos. Se hoje ainda não foi zerado, conta até ontem. */
  current: number
  best: number
  /** Hoje ainda não foi zerado, mas ontem foi: a sequência se perde se hoje passar em branco. */
  atRisk: boolean
}

/**
 * O escopo do dia: as folhas — itens sem filhos — de tudo o que a visão Hoje mostra, incluindo
 * atrasados e itens sem data. Um pai nunca conta; o progresso dele vem dos filhos.
 */
export function dayScope(items: Items, today: DateKey): DayScope {
  const rows = buildVisibleRows(items, { view: 'today', query: '', today, collapsed: {} })
  let done = 0
  let open = 0
  for (const row of rows) {
    if (row.isContext || childIds(items, row.id).length > 0) continue
    if (items[row.id].done) done++
    else open++
  }
  return { done, open }
}

/** Folhas concluídas hoje, em qualquer lugar da lista. */
export function completedLeavesToday(items: Items, today: DateKey): number {
  let count = 0
  for (const item of Object.values(items)) {
    if (item.completedOn === today && childIds(items, item.id).length === 0) count++
  }
  return count
}

/** Um dia está zerado quando a visão Hoje não tem nada aberto e algo foi concluído nele. */
export function isDayCleared(items: Items, today: DateKey): boolean {
  return dayScope(items, today).open === 0 && completedLeavesToday(items, today) > 0
}

/** Sequência de dias zerados e a melhor já alcançada. */
export function computeStreak(clearedDays: Readonly<Record<string, true>>, today: DateKey): Streak {
  const yesterday = addDays(today, -1)
  const todayCleared = clearedDays[today] === true
  const anchor = todayCleared ? today : yesterday

  let current = 0
  for (let day = anchor; clearedDays[day] === true; day = addDays(day, -1)) current++

  const days = Object.keys(clearedDays).sort()
  let best = 0
  let run = 0
  let previous: DateKey | null = null
  for (const day of days) {
    run = previous !== null && diffInDays(previous, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }

  return { current, best, atRisk: !todayCleared && clearedDays[yesterday] === true }
}

/** Remove os dias zerados mais antigos que a janela de retenção. */
export function pruneClearedDays(
  clearedDays: Readonly<Record<string, true>>,
  today: DateKey
): Record<string, true> {
  const oldest = addDays(today, -TODO_CLEARED_DAYS_RETENTION)
  const kept: Record<string, true> = {}
  for (const day of Object.keys(clearedDays)) if (day >= oldest) kept[day] = true
  return kept
}
