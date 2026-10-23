import type { DateKey } from '@/lib/todo/dates'
import { formatDayLabel, weekdayLabels } from '@/lib/todo/format'
import { defaultRepeatFields, fieldsToRule, ruleToFields } from '@/lib/todo/recurrence-form'
import type { DetailsFormValues, Recurrence } from '@/lib/validations/todo'

/**
 * "Quando" de uma tarefa que ainda vai ser criada: quando aparece, o prazo e a repetição. Fica no
 * estado do campo de criação até a pessoa apertar Enter.
 */
export type Schedule = {
  startsOn: DateKey | null
  dueOn: DateKey | null
  rule: Recurrence | null
  endsOn: DateKey | null
}

/**
 * Para onde o foco vai quando um menu/modal do campo de criação fecha: `HTMLElement` = esse
 * elemento; `true` = o padrão (o botão que o abriu); recebe como o fechamento foi feito.
 */
export type ReturnFocus = (closeType: string) => HTMLElement | boolean | null

export const EMPTY_SCHEDULE: Schedule = { startsOn: null, dueOn: null, rule: null, endsOn: null }

export function isEmptySchedule(schedule: Schedule): boolean {
  return (
    schedule.startsOn === null &&
    schedule.dueOn === null &&
    schedule.rule === null &&
    schedule.endsOn === null
  )
}

/** Os valores iniciais do formulário do diálogo a partir do que já foi escolhido. */
export function scheduleToForm(schedule: Schedule, today: DateKey): DetailsFormValues {
  return {
    startsOn: schedule.startsOn,
    dueOn: schedule.dueOn,
    ...(schedule.rule
      ? ruleToFields(schedule.rule, schedule.endsOn, schedule.startsOn ?? today)
      : defaultRepeatFields(schedule.startsOn ?? today)),
  }
}

/** O que o formulário do diálogo vira. Numa tarefa que se repete não há prazo: cada ocorrência vence no seu dia. */
export function formToSchedule(values: DetailsFormValues): Schedule {
  const rule = fieldsToRule(values)
  return {
    startsOn: values.startsOn,
    dueOn: rule ? null : values.dueOn,
    rule,
    endsOn: rule ? values.endsOn : null,
  }
}

type Translator = (key: string, values?: Record<string, string | number>) => string

/**
 * Um resumo curto do agendamento para o botão ("Todo dia", "A cada 2 semanas (seg., qua.)",
 * "Prazo amanhã"), ou `null` se nada foi escolhido.
 */
export function scheduleSummary(
  schedule: Schedule,
  { t, locale, today }: { t: Translator; locale: string; today: DateKey }
): string | null {
  const { rule } = schedule
  if (rule) {
    const base = t(`schedule.summary.${rule.freq}`, { count: rule.interval })
    if (rule.freq === 'weekly') {
      const names = weekdayLabels(locale)
      return `${base} (${rule.weekdays.map((day) => names[day].short).join(', ')})`
    }
    if (rule.freq === 'monthly') {
      const detail =
        rule.day === 'last'
          ? t('schedule.summary.lastDay')
          : t('schedule.summary.day', { day: rule.day })
      return `${base} (${detail})`
    }
    return base
  }
  if (schedule.dueOn) {
    return t('schedule.summary.due', { date: formatDayLabel(schedule.dueOn, today, locale) })
  }
  if (schedule.startsOn) {
    return t('schedule.summary.starts', { date: formatDayLabel(schedule.startsOn, today, locale) })
  }
  return null
}
