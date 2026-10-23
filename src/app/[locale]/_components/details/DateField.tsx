'use client'

import { Icon } from '@iconify/react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { getDateLocale } from '@/lib/date-locale'
import { addDays, type DateKey, toDateKey, toLocalDate } from '@/lib/todo/dates'
import { formatDayLong } from '@/lib/todo/format'
import { useTodoUi } from '@/store/todo-ui'

type DateFieldProps = {
  id: string
  label: string
  value: DateKey | null
  onChange: (value: DateKey | null) => void
  invalid?: boolean
}

/** Campo de data opcional: botão que abre um calendário, com atalhos para hoje e amanhã. */
export function DateField({ id, label, value, onChange, invalid }: DateFieldProps) {
  const t = useTranslations('todo.details')
  const locale = useLocale()
  const today = useTodoUi((state) => state.today)
  const [open, setOpen] = useState(false)

  const choose = (day: DateKey | null) => {
    onChange(day)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              className="justify-start font-normal"
            >
              <Icon icon="lucide:calendar" className="size-4" aria-hidden />
              <span className={value ? '' : 'text-muted-foreground'}>
                {value ? formatDayLong(value, locale) : t('noDate')}
              </span>
            </Button>
          }
        />
        <PopoverPopup align="start">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => choose(today)}>
                {t('today')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => choose(addDays(today, 1))}
              >
                {t('tomorrow')}
              </Button>
              {value && (
                <Button type="button" size="sm" variant="ghost" onClick={() => choose(null)}>
                  <Icon icon="lucide:x" className="size-3.5" aria-hidden />
                  {t('clear')}
                </Button>
              )}
            </div>
            <Calendar
              mode="single"
              locale={getDateLocale(locale)}
              selected={value ? toLocalDate(value) : undefined}
              defaultMonth={value ? toLocalDate(value) : toLocalDate(today)}
              onSelect={(day) => {
                if (day) choose(toDateKey(day))
              }}
            />
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  )
}
