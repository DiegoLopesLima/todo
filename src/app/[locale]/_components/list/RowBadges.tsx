import { Icon } from '@iconify/react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { addDays, type DateKey } from '@/lib/todo/dates'
import { formatDayLabel } from '@/lib/todo/format'
import { cn } from '@/lib/utils'
import type { Item } from '@/lib/validations/todo'
import { PriorityFlag } from './PriorityFlag'

type RowBadgesProps = {
  item: Item
  today: DateKey
}

/** Selos da linha: prioridade, repetição, prazo (com atraso em destaque) e início agendado. */
export function RowBadges({ item, today }: RowBadgesProps) {
  const t = useTranslations('todo.row')
  const locale = useLocale()

  const overdue = !item.done && item.dueOn !== null && item.dueOn < today
  const soon = !item.done && item.dueOn !== null && !overdue && item.dueOn <= addDays(today, 1)
  const scheduled = item.startsOn !== null && item.startsOn > today

  return (
    <>
      {item.priority !== 'p4' && <PriorityFlag priority={item.priority} />}
      {item.seriesId !== null && (
        <span className="inline-flex shrink-0 text-muted-foreground">
          <Icon icon="lucide:repeat" className="size-3.5" aria-hidden />
          <span className="sr-only">{t('recurring')}</span>
        </span>
      )}
      {item.dueOn !== null && (
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 gap-1 font-normal tabular-nums',
            overdue && 'border-destructive/40 bg-destructive/10 text-destructive-foreground',
            soon && 'border-warning/40 bg-warning/10 text-warning-foreground'
          )}
        >
          <Icon
            icon={overdue ? 'lucide:circle-alert' : 'lucide:calendar'}
            className="size-3"
            aria-hidden
          />
          {overdue && <span className="sr-only">{t('overdue')}: </span>}
          {formatDayLabel(item.dueOn, today, locale)}
        </Badge>
      )}
      {scheduled && item.startsOn !== null && (
        <Badge variant="outline" className="shrink-0 gap-1 font-normal text-muted-foreground">
          <Icon icon="lucide:calendar-clock" className="size-3" aria-hidden />
          {t('startsOn', { date: formatDayLabel(item.startsOn, today, locale) })}
        </Badge>
      )}
    </>
  )
}
