'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { ProgressRing } from '@/components/ProgressRing'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { computeStreak, dayScope } from '@/lib/todo/stats'
import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoUi } from '@/store/todo-ui'

/** O anel "X de Y hoje" e a sequência de dias zerados — a parte da tela que dá vontade de continuar. */
export function DayProgress() {
  const t = useTranslations('todo.progress')
  const items = useTodoDocument((state) => state.doc.items)
  const clearedDays = useTodoDocument((state) => state.doc.clearedDays)
  const today = useTodoUi((state) => state.today)

  const scope = useMemo(() => dayScope(items, today), [items, today])
  const streak = useMemo(() => computeStreak(clearedDays, today), [clearedDays, today])

  const total = scope.done + scope.open
  const cleared = total > 0 && scope.open === 0
  const summary =
    total === 0 ? t('none') : cleared ? t('allDone') : t('count', { done: scope.done, total })

  return (
    <section className="flex min-w-0 items-center gap-3" aria-label={t('label')}>
      <ProgressRing value={total === 0 ? 0 : scope.done / total} complete={cleared}>
        <span className="font-semibold text-xs tabular-nums">{cleared ? '✓' : scope.done}</span>
      </ProgressRing>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">{summary}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={cn(
                  'inline-flex w-fit items-center gap-1 text-xs',
                  streak.current > 0 ? 'text-priority-2' : 'text-muted-foreground'
                )}
              >
                <Icon
                  icon="lucide:flame"
                  className={cn('size-3.5', streak.atRisk && 'motion-safe:animate-pulse')}
                  aria-hidden
                />
                {streak.current > 0 ? t('streak', { count: streak.current }) : t('streakNone')}
              </span>
            }
          />
          <TooltipContent side="bottom">
            {streak.atRisk ? t('streakAtRisk') : t('best', { count: streak.best })}
          </TooltipContent>
        </Tooltip>
      </div>
    </section>
  )
}
