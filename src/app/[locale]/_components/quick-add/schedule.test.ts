import { createTranslator } from 'next-intl'

import type { Recurrence } from '@/lib/validations/todo'
import messages from '../../../../../messages/pt-BR.json'
import {
  EMPTY_SCHEDULE,
  formToSchedule,
  isEmptySchedule,
  type Schedule,
  scheduleSummary,
  scheduleToForm,
} from './schedule'

const t = createTranslator({ locale: 'pt-BR', messages, namespace: 'todo' }) as unknown as (
  key: string,
  values?: Record<string, string | number>
) => string
const today = '2026-03-10'
const summary = (schedule: Schedule) => scheduleSummary(schedule, { t, locale: 'pt-BR', today })

describe('scheduleSummary', () => {
  it('sem nada escolhido não há resumo', () => {
    expect(summary(EMPTY_SCHEDULE)).toBeNull()
  })

  const cases: [Recurrence, string][] = [
    [{ freq: 'daily', interval: 1 }, 'Todo dia'],
    [{ freq: 'daily', interval: 3 }, 'A cada 3 dias'],
    [{ freq: 'yearly', interval: 1 }, 'Todo ano'],
    [{ freq: 'monthly', interval: 1, day: 'last' }, 'Todo mês (último dia)'],
    [{ freq: 'monthly', interval: 2, day: 5 }, 'A cada 2 meses (dia 5)'],
    [{ freq: 'weekly', interval: 1, weekdays: [3], weekStartsOn: 0 }, 'Toda semana (qua.)'],
    [
      { freq: 'weekly', interval: 2, weekdays: [1, 3], weekStartsOn: 0 },
      'A cada 2 semanas (seg., qua.)',
    ],
  ]

  it.each(cases)('repetição %j → %s', (rule, expected) => {
    expect(summary({ ...EMPTY_SCHEDULE, rule })).toBe(expected)
  })

  it('sem repetição, mostra o prazo; só com início, mostra quando começa', () => {
    expect(summary({ ...EMPTY_SCHEDULE, dueOn: '2026-03-11' })).toBe('Prazo amanhã')
    expect(summary({ ...EMPTY_SCHEDULE, startsOn: '2026-03-10' })).toBe('Começa hoje')
    expect(summary({ ...EMPTY_SCHEDULE, startsOn: '2026-03-10', dueOn: '2026-03-12' })).toBe(
      'Prazo quinta, 12 mar'
    )
  })
})

describe('schedule ↔ formulário', () => {
  it('isEmptySchedule', () => {
    expect(isEmptySchedule(EMPTY_SCHEDULE)).toBe(true)
    expect(isEmptySchedule({ ...EMPTY_SCHEDULE, dueOn: '2026-03-11' })).toBe(false)
  })

  it('o formulário parte do que foi escolhido, ou dos padrões do dia de referência', () => {
    expect(scheduleToForm(EMPTY_SCHEDULE, today)).toMatchObject({
      startsOn: null,
      dueOn: null,
      freq: 'none',
      weekdays: [2],
      monthDay: 10,
    })
    const chosen: Schedule = {
      startsOn: '2026-03-04',
      dueOn: null,
      rule: { freq: 'weekly', interval: 2, weekdays: [1, 4], weekStartsOn: 0 },
      endsOn: '2026-12-31',
    }
    expect(scheduleToForm(chosen, today)).toMatchObject({
      freq: 'weekly',
      interval: 2,
      weekdays: [1, 4],
      endsOn: '2026-12-31',
    })
    expect(formToSchedule(scheduleToForm(chosen, today))).toEqual(chosen)
  })

  it('numa tarefa que se repete não há prazo: cada ocorrência vence no próprio dia', () => {
    const form = {
      ...scheduleToForm(EMPTY_SCHEDULE, today),
      freq: 'daily' as const,
      dueOn: '2026-03-15',
    }
    expect(formToSchedule(form)).toMatchObject({
      dueOn: null,
      rule: { freq: 'daily', interval: 1 },
    })
  })

  it('sem repetição, o fim da repetição é descartado', () => {
    const form = {
      ...scheduleToForm(EMPTY_SCHEDULE, today),
      endsOn: '2026-12-31',
      dueOn: '2026-03-15',
    }
    expect(formToSchedule(form)).toEqual({ ...EMPTY_SCHEDULE, dueOn: '2026-03-15' })
  })
})
