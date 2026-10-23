import { TODO_DEFAULT_PRIORITY } from '@/constants/todo'
import type { Ctx } from '@/lib/todo/ctx'
import { toDateKey } from '@/lib/todo/dates'
import type { Items } from '@/lib/todo/tree'
import type { Item, Series, TodoDocument } from '@/lib/validations/todo'

/** UUID determinístico a partir de um número — ids legíveis e válidos nos testes. */
export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/**
 * Contexto de teste: relógio fixo (meio-dia local, então o dia não vira com o fuso do CI) e ids
 * sequenciais a partir de `firstId`.
 */
export function testCtx(day = '2026-03-10', firstId = 1000): Ctx {
  const now = new Date(`${day}T12:00:00`)
  let counter = firstId
  return { now, today: toDateKey(now), newId: () => uuid(counter++) }
}

const STAMP = '2026-03-01T12:00:00.000Z'

/** Item aberto, `p4`, na raiz; sobrescreva o que o teste precisa. */
export function item(overrides: Partial<Item> & { id: string }): Item {
  return {
    parentId: null,
    text: overrides.id,
    priority: TODO_DEFAULT_PRIORITY,
    rank: 'a0',
    done: false,
    completedAt: null,
    completedOn: null,
    startsOn: null,
    dueOn: null,
    seriesId: null,
    occurrenceOn: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  }
}

/** Item já concluído em `completedOn`. */
export function doneItem(
  overrides: Partial<Item> & { id: string },
  completedOn = '2026-03-10'
): Item {
  return item({
    done: true,
    completedOn,
    completedAt: `${completedOn}T12:00:00.000Z`,
    ...overrides,
  })
}

export function itemsFrom(...list: Item[]): Items {
  return Object.fromEntries(list.map((entry) => [entry.id, entry]))
}

export function emptyDoc(): TodoDocument {
  return {
    items: {},
    series: {},
    cursors: {},
    clearedDays: {},
    history: [],
    rev: 0,
    meta: { lastExportedAt: null, changesSinceExport: 0 },
  }
}

export function docWith(parts: {
  items?: Item[]
  series?: Series[]
  cursors?: Record<string, string>
}): TodoDocument {
  return {
    ...emptyDoc(),
    items: itemsFrom(...(parts.items ?? [])),
    series: Object.fromEntries((parts.series ?? []).map((s) => [s.id, s])),
    cursors: parts.cursors ?? {},
  }
}

/** Série diária simples, com molde opcional. */
export function dailySeries(overrides: Partial<Series> & { id: string }): Series {
  return {
    rule: { freq: 'daily', interval: 1 },
    startsOn: '2026-03-01',
    endsOn: null,
    parentId: null,
    blueprint: { text: 'Code review', priority: 'p2', children: [] },
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  }
}
