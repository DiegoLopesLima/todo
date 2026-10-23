import { TODO_MAX_INTERVAL } from '@/constants/todo'
import { defaultRepeatFields, fieldsToRule, ruleToFields } from '@/lib/todo/recurrence-form'
import { detailsFormSchema, type Recurrence } from '@/lib/validations/todo'

// 2026-03-11 é uma quarta-feira.
const anchor = '2026-03-11'
const base = { startsOn: null, dueOn: null, ...defaultRepeatFields(anchor) }

describe('recurrence-form', () => {
  it('os padrões vêm do dia de referência', () => {
    expect(defaultRepeatFields(anchor)).toEqual({
      freq: 'none',
      interval: 1,
      weekdays: [3],
      monthDay: 11,
      endsOn: null,
    })
  })

  describe('fieldsToRule', () => {
    it('"não repete" não tem regra', () => {
      expect(fieldsToRule(base)).toBeNull()
    })

    it.each([
      [
        { freq: 'daily', interval: 2 },
        { freq: 'daily', interval: 2 },
      ],
      [
        { freq: 'yearly', interval: 1 },
        { freq: 'yearly', interval: 1 },
      ],
      [
        { freq: 'monthly', interval: 1, monthDay: 'last' },
        { freq: 'monthly', interval: 1, day: 'last' },
      ],
      [
        { freq: 'monthly', interval: 3, monthDay: 31 },
        { freq: 'monthly', interval: 3, day: 31 },
      ],
    ] as const)('monta a regra de %j', (fields, rule) => {
      expect(fieldsToRule({ ...base, ...fields })).toEqual(rule)
    })

    it('semanal ordena e deduplica os dias', () => {
      expect(
        fieldsToRule({ ...base, freq: 'weekly', interval: 1, weekdays: [5, 1, 5, 3] })
      ).toEqual({
        freq: 'weekly',
        interval: 1,
        weekdays: [1, 3, 5],
        weekStartsOn: 0,
      })
    })
  })

  describe('ruleToFields', () => {
    it('sem regra, volta aos padrões', () => {
      expect(ruleToFields(null, null, anchor)).toEqual(defaultRepeatFields(anchor))
    })

    it('é o inverso de fieldsToRule', () => {
      const rule: Recurrence = { freq: 'weekly', interval: 2, weekdays: [1, 4], weekStartsOn: 0 }
      const fields = ruleToFields(rule, '2026-12-31', anchor)
      expect(fields).toMatchObject({
        freq: 'weekly',
        interval: 2,
        weekdays: [1, 4],
        endsOn: '2026-12-31',
      })
      expect(fieldsToRule({ ...base, ...fields })).toEqual(rule)

      const monthly: Recurrence = { freq: 'monthly', interval: 1, day: 'last' }
      expect(fieldsToRule({ ...base, ...ruleToFields(monthly, null, anchor) })).toEqual(monthly)
    })
  })
})

describe('detailsFormSchema', () => {
  const valid = { ...base }
  const messages = (values: unknown) => {
    const result = detailsFormSchema.safeParse(values)
    return result.success ? [] : result.error.issues.map((issue) => issue.message)
  }

  it('aceita um formulário sem repetição', () => {
    expect(messages(valid)).toEqual([])
  })

  it('exige início antes ou igual ao prazo', () => {
    expect(messages({ ...valid, startsOn: '2026-03-12', dueOn: '2026-03-10' })).toContain(
      'dates_order'
    )
    expect(messages({ ...valid, startsOn: '2026-03-10', dueOn: '2026-03-10' })).toEqual([])
  })

  it('semanal exige ao menos um dia', () => {
    expect(messages({ ...valid, freq: 'weekly', weekdays: [] })).toContain('weekdays_required')
  })

  it('o intervalo respeita o máximo da frequência', () => {
    expect(
      messages({ ...valid, freq: 'yearly', interval: TODO_MAX_INTERVAL.yearly + 1 })
    ).toContain('interval_range')
    expect(messages({ ...valid, freq: 'daily', interval: TODO_MAX_INTERVAL.daily })).toEqual([])
    expect(messages({ ...valid, freq: 'daily', interval: 0 }).length).toBeGreaterThan(0)
  })

  it('o fim da repetição não pode ser antes do início', () => {
    expect(
      messages({ ...valid, freq: 'daily', startsOn: '2026-03-10', endsOn: '2026-03-01' })
    ).toContain('dates_order')
  })
})
