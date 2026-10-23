'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TODO_MAX_INTERVAL } from '@/constants/todo'
import { RECURRENCE_FREQUENCIES } from '@/enums/todo'
import { weekdayLabels } from '@/lib/todo/format'
import type { DetailsFormValues } from '@/lib/validations/todo'
import { DateField } from './DateField'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

type RepeatFieldsProps = {
  form: UseFormReturn<DetailsFormValues>
  disabled?: boolean
}

/** Campos da repetição: frequência, intervalo, dias da semana ou do mês e data de término. */
export function RepeatFields({ form, disabled = false }: RepeatFieldsProps) {
  const t = useTranslations('todo')
  const v = useTranslations('validation')
  const locale = useLocale()
  const { control, register, setValue, formState } = form
  const freq = useWatch({ control, name: 'freq' })
  const interval = useWatch({ control, name: 'interval' })
  const monthDay = useWatch({ control, name: 'monthDay' })

  const weekdayNames = useMemo(() => weekdayLabels(locale), [locale])

  const error = (name: keyof DetailsFormValues) => {
    const message = formState.errors[name]?.message
    return typeof message === 'string' ? v(message) : null
  }

  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="sr-only">{t('details.repeat')}</legend>

      <div className="flex flex-col gap-1.5">
        <Label>{t('details.repeat')}</Label>
        <Controller
          control={control}
          name="freq"
          render={({ field }) => (
            <ToggleGroup
              value={[field.value]}
              variant="outline"
              size="sm"
              className="flex-wrap"
              aria-label={t('details.repeat')}
              onValueChange={(next) => {
                const chosen = next[0]
                if (chosen) field.onChange(chosen)
              }}
            >
              {(['none', ...RECURRENCE_FREQUENCIES] as const).map((option) => (
                <ToggleGroupItem key={option} value={option}>
                  {t(`recurrence.freq.${option}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </div>

      {freq !== 'none' && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repeat-interval">{t('recurrence.every')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="repeat-interval"
                type="number"
                inputMode="numeric"
                min={1}
                max={TODO_MAX_INTERVAL[freq]}
                className="w-24"
                aria-invalid={error('interval') ? true : undefined}
                {...register('interval', { valueAsNumber: true })}
              />
              <span className="text-muted-foreground text-sm">
                {t(`recurrence.unit.${freq}`, { count: Number.isFinite(interval) ? interval : 1 })}
              </span>
            </div>
            {error('interval') && (
              <p className="text-destructive-foreground text-xs">{error('interval')}</p>
            )}
          </div>

          {freq === 'weekly' && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('recurrence.onDays')}</Label>
              <Controller
                control={control}
                name="weekdays"
                render={({ field }) => (
                  <ToggleGroup
                    multiple
                    value={field.value.map(String)}
                    variant="outline"
                    size="sm"
                    className="flex-wrap"
                    aria-label={t('recurrence.onDays')}
                    onValueChange={(next) => field.onChange(next.map(Number))}
                  >
                    {WEEKDAYS.map((day) => (
                      <ToggleGroupItem
                        key={day}
                        value={String(day)}
                        aria-label={weekdayNames[day].long}
                      >
                        {weekdayNames[day].short}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
              {error('weekdays') && (
                <p className="text-destructive-foreground text-xs">{error('weekdays')}</p>
              )}
            </div>
          )}

          {freq === 'monthly' && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('recurrence.onDay')}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  value={[monthDay === 'last' ? 'last' : 'day']}
                  variant="outline"
                  size="sm"
                  aria-label={t('recurrence.onDay')}
                  onValueChange={(next) => {
                    if (next[0] === 'last') setValue('monthDay', 'last')
                    else if (next[0] === 'day') setValue('monthDay', 1)
                  }}
                >
                  <ToggleGroupItem value="day">{t('recurrence.dayOfMonth')}</ToggleGroupItem>
                  <ToggleGroupItem value="last">{t('recurrence.lastDay')}</ToggleGroupItem>
                </ToggleGroup>
                {monthDay !== 'last' && (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    className="w-20"
                    aria-label={t('recurrence.dayOfMonth')}
                    {...register('monthDay', { valueAsNumber: true })}
                  />
                )}
              </div>
            </div>
          )}

          <Controller
            control={control}
            name="endsOn"
            render={({ field, fieldState }) => (
              <DateField
                id="repeat-ends"
                label={t('recurrence.endsOn')}
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
              />
            )}
          />
        </>
      )}
    </fieldset>
  )
}
