'use client'

import { Icon } from '@iconify/react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTodoUi } from '@/store/todo-ui'
import { type Schedule, scheduleSummary } from './schedule'

type ScheduleControlProps = { value: Schedule; onOpen: () => void }

/**
 * O botão "quando e repetição" do campo de criação. Vazio é só um ícone; com algo escolhido ganha
 * um resumo ("Todo dia", "Prazo amanhã") do `md` em diante e um pontinho no celular.
 */
export function ScheduleControl({ value, onOpen }: ScheduleControlProps) {
  const t = useTranslations('todo')
  const locale = useLocale()
  const today = useTodoUi((state) => state.today)
  const summary = scheduleSummary(value, {
    t: (key, values) => t(key, values),
    locale,
    today,
  })

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={summary ? `${t('schedule.label')}: ${summary}` : t('schedule.label')}
            aria-haspopup="dialog"
            className={cn(
              'relative gap-1.5 px-2',
              summary ? 'text-foreground' : 'text-muted-foreground'
            )}
            onClick={onOpen}
          >
            <Icon
              icon={value.rule ? 'lucide:repeat' : 'lucide:calendar'}
              className="size-4 shrink-0"
              aria-hidden
            />
            {summary && (
              <>
                <span className="motion-safe:fade-in motion-safe:slide-in-from-left-1 motion-safe:animate-in hidden max-w-36 truncate text-xs motion-safe:duration-200 md:inline">
                  {summary}
                </span>
                <span
                  aria-hidden
                  className="motion-safe:zoom-in motion-safe:animate-in absolute end-1 top-1 size-1.5 rounded-full bg-primary motion-safe:duration-200 md:hidden"
                />
              </>
            )}
          </Button>
        }
      />
      <TooltipContent side="top">{t('schedule.label')}</TooltipContent>
    </Tooltip>
  )
}
