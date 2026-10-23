'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'
import { useDataActions } from '../data/useDataActions'

type HeaderMenuProps = {
  onHistory: () => void
  onImport: () => void
  onHelp: () => void
}

/** Menu do cabeçalho: histórico, exportar/importar, limpeza e preferências. */
export function HeaderMenu({ onHistory, onImport, onHelp }: HeaderMenuProps) {
  const t = useTranslations('todo.menu')
  const { exportData, dismissOverdue, clearCompleted } = useDataActions()
  const confetti = useTodoPrefs((state) => state.confetti)
  const today = useTodoUi((state) => state.today)
  const hasOverdue = useTodoDocument((state) =>
    Object.values(state.doc.items).some(
      (item) =>
        item.seriesId !== null &&
        !item.done &&
        item.occurrenceOn !== null &&
        item.occurrenceOn < today
    )
  )

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label={t('label')}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'text-muted-foreground'
              )}
            >
              <Icon icon="lucide:ellipsis" className="size-[1.15rem]" aria-hidden />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="bottom">{t('label')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onClick={onHistory}>
          <Icon icon="lucide:history" aria-hidden />
          {t('history')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportData}>
          <Icon icon="lucide:download" aria-hidden />
          {t('export')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Icon icon="lucide:upload" aria-hidden />
          {t('import')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!hasOverdue} onClick={dismissOverdue}>
          <Icon icon="lucide:alarm-clock" aria-hidden />
          {t('dismissOverdue')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={clearCompleted}>
          <Icon icon="lucide:eraser" aria-hidden />
          {t('clearCompleted')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={confetti}
          onCheckedChange={(checked) => useTodoPrefs.getState().setConfetti(checked === true)}
        >
          <Icon icon="lucide:party-popper" aria-hidden />
          {t('confetti')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem onClick={onHelp}>
          <Icon icon="lucide:keyboard" aria-hidden />
          {t('shortcuts')}
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
