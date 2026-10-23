'use client'

import { Icon } from '@iconify/react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import type { HistoryEventType } from '@/enums/todo'
import { cn } from '@/lib/utils'
import type { HistoryEvent } from '@/lib/validations/todo'

const ICONS: Record<HistoryEventType, string> = {
  created: 'lucide:plus',
  edited: 'lucide:pencil',
  completed: 'lucide:circle-check',
  reopened: 'lucide:undo-2',
  moved: 'lucide:corner-down-right',
  reordered: 'lucide:arrow-down-wide-narrow',
  deleted: 'lucide:trash-2',
  imported: 'lucide:upload',
  occurrence_created: 'lucide:repeat',
  occurrences_skipped: 'lucide:alarm-clock',
  occurrences_dismissed: 'lucide:eraser',
  series_created: 'lucide:repeat',
  series_changed: 'lucide:repeat',
  series_ended: 'lucide:calendar-x',
  undone: 'lucide:undo-2',
  redone: 'lucide:redo-2',
}

/** Campos cujo valor é um id (o histórico guarda o id do pai, que não diz nada a quem lê). */
const OPAQUE_FIELDS = new Set(['parentId', 'rank'])

type HistoryEventRowProps = { event: HistoryEvent; undone: boolean }

/** Uma linha do histórico: o que aconteceu, quando e (se for edição) o que mudou. */
export function HistoryEventRow({ event, undone }: HistoryEventRowProps) {
  const t = useTranslations('todo.history')
  const tp = useTranslations('todo.priority')
  const locale = useLocale()
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(event.at)
  )

  const describeValue = (field: string, value: string | number | boolean | null): string => {
    if (value === null || value === '') return t('changes.none')
    if (field === 'priority') return tp(String(value))
    return String(value)
  }

  const changes = (event.changes ?? []).filter((change) => !OPAQUE_FIELDS.has(change.field))

  return (
    <li className="flex items-start gap-3 py-2 text-sm">
      <Icon
        icon={ICONS[event.type]}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn('break-words', undone && 'text-muted-foreground line-through')}>
          {t(`events.${event.type}`, {
            text: event.itemText || t('untitled'),
            count: event.count ?? 0,
          })}
        </p>
        {changes.length > 0 && (
          <ul className="text-muted-foreground text-xs">
            {changes.map((change) => (
              <li key={change.field} className="break-words">
                {t(`fields.${change.field}`)}: {describeValue(change.field, change.from)} →{' '}
                {describeValue(change.field, change.to)}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
          <time dateTime={event.at}>{time}</time>
          {event.origin === 'system' && (
            <Badge variant="outline" className="font-normal">
              {t('origin.system')}
            </Badge>
          )}
          {undone && (
            <Badge variant="outline" className="font-normal">
              {t('undoneBadge')}
            </Badge>
          )}
        </div>
      </div>
    </li>
  )
}
