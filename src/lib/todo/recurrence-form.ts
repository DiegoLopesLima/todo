import { type DateKey, parseDateKey, weekdayOf } from '@/lib/todo/dates'
import type { DetailsFormValues, Recurrence } from '@/lib/validations/todo'

/** Quando a semana começa nas regras criadas pela interface (domingo, como nos dois idiomas do app). */
const WEEK_STARTS_ON = 0

/** O formulário parte do dia de referência: o fim de semana/mês dele são os padrões da regra. */
export function defaultRepeatFields(
  anchor: DateKey
): Pick<DetailsFormValues, 'freq' | 'interval' | 'weekdays' | 'monthDay' | 'endsOn'> {
  return {
    freq: 'none',
    interval: 1,
    weekdays: [weekdayOf(anchor)],
    monthDay: parseDateKey(anchor)?.day ?? 1,
    endsOn: null,
  }
}

/** Preenche os campos de repetição do formulário a partir de uma regra existente (ou a ausência dela). */
export function ruleToFields(
  rule: Recurrence | null,
  endsOn: DateKey | null,
  anchor: DateKey
): Pick<DetailsFormValues, 'freq' | 'interval' | 'weekdays' | 'monthDay' | 'endsOn'> {
  const base = defaultRepeatFields(anchor)
  if (!rule) return base
  return {
    ...base,
    freq: rule.freq,
    interval: rule.interval,
    weekdays: rule.freq === 'weekly' ? rule.weekdays : base.weekdays,
    monthDay: rule.freq === 'monthly' ? rule.day : base.monthDay,
    endsOn,
  }
}

/** A regra que o formulário descreve, ou `null` se "não repete". */
export function fieldsToRule(
  fields: Pick<DetailsFormValues, 'freq' | 'interval' | 'weekdays' | 'monthDay'>
): Recurrence | null {
  const { freq, interval } = fields
  switch (freq) {
    case 'none':
      return null
    case 'daily':
      return { freq, interval }
    case 'weekly':
      return {
        freq,
        interval,
        weekdays: [...new Set(fields.weekdays)].sort((a, b) => a - b),
        weekStartsOn: WEEK_STARTS_ON,
      }
    case 'monthly':
      return { freq, interval, day: fields.monthDay }
    case 'yearly':
      return { freq, interval }
  }
}
