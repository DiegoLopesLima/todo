import { TODO_CLEARED_DAYS_RETENTION } from '@/constants/todo'
import { addDays } from '@/lib/todo/dates'
import {
  completedLeavesToday,
  computeStreak,
  dayScope,
  isDayCleared,
  pruneClearedDays,
} from '@/lib/todo/stats'
import { doneItem, item, itemsFrom, uuid } from '@/test/todo-fixtures'

const today = '2026-03-10'
const days = (...keys: string[]) => Object.fromEntries(keys.map((key) => [key, true as const]))

describe('stats', () => {
  describe('dayScope', () => {
    it('conta folhas abertas e concluídas da visão Hoje, sem contar pais', () => {
      const parent = uuid(1)
      const items = itemsFrom(
        item({ id: parent }),
        doneItem({ id: uuid(2), parentId: parent, rank: 'a0' }),
        item({ id: uuid(3), parentId: parent, rank: 'a1' }),
        item({ id: uuid(4), rank: 'a1' }),
        item({ id: uuid(5), rank: 'a2', startsOn: '2026-03-20' })
      )
      expect(dayScope(items, today)).toEqual({ done: 1, open: 2 })
    })

    it('inclui atrasados e itens sem data', () => {
      const items = itemsFrom(
        item({ id: uuid(1), dueOn: '2026-03-01' }),
        item({ id: uuid(2), rank: 'a1' })
      )
      expect(dayScope(items, today).open).toBe(2)
    })

    it('lista vazia: zero de zero', () => {
      expect(dayScope({}, today)).toEqual({ done: 0, open: 0 })
    })
  })

  describe('isDayCleared', () => {
    it('exige zero abertos E ao menos uma conclusão hoje', () => {
      expect(isDayCleared(itemsFrom(doneItem({ id: uuid(1) }, today)), today)).toBe(true)
      expect(isDayCleared({}, today)).toBe(false)
      expect(
        isDayCleared(
          itemsFrom(doneItem({ id: uuid(1) }, today), item({ id: uuid(2), rank: 'a1' })),
          today
        )
      ).toBe(false)
    })

    it('uma conclusão de outro dia não zera o dia de hoje', () => {
      expect(isDayCleared(itemsFrom(doneItem({ id: uuid(1) }, '2026-03-09')), today)).toBe(false)
    })
  })

  it('completedLeavesToday ignora pais e outros dias', () => {
    const parent = uuid(1)
    const items = itemsFrom(
      doneItem({ id: parent }, today),
      doneItem({ id: uuid(2), parentId: parent }, today),
      doneItem({ id: uuid(3), rank: 'a1' }, '2026-03-09')
    )
    expect(completedLeavesToday(items, today)).toBe(1)
  })

  describe('computeStreak', () => {
    it('conta os dias zerados seguidos terminando hoje', () => {
      expect(computeStreak(days('2026-03-08', '2026-03-09', today), today)).toEqual({
        current: 3,
        best: 3,
        atRisk: false,
      })
    })

    it('hoje ainda não zerado e ontem sim: a sequência está em risco, mas continua', () => {
      expect(computeStreak(days('2026-03-08', '2026-03-09'), today)).toEqual({
        current: 2,
        best: 2,
        atRisk: true,
      })
    })

    it('um dia sem nenhuma conclusão quebra a sequência', () => {
      expect(computeStreak(days('2026-03-05', '2026-03-06', '2026-03-08'), today)).toEqual({
        current: 0,
        best: 2,
        atRisk: false,
      })
    })

    it('guarda a melhor sequência mesmo depois de quebrada', () => {
      const streak = computeStreak(days('2026-02-01', '2026-02-02', '2026-02-03', today), today)
      expect(streak).toEqual({ current: 1, best: 3, atRisk: false })
    })

    it('sem dias zerados', () => {
      expect(computeStreak({}, today)).toEqual({ current: 0, best: 0, atRisk: false })
    })
  })

  it('pruneClearedDays descarta o que passou da janela de retenção', () => {
    const old = addDays(today, -TODO_CLEARED_DAYS_RETENTION - 1)
    const edge = addDays(today, -TODO_CLEARED_DAYS_RETENTION)
    expect(pruneClearedDays(days(old, edge, today), today)).toEqual(days(edge, today))
  })
})
