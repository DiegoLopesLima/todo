'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PRIORITIES, type Priority } from '@/enums/todo'
import { cn } from '@/lib/utils'
import type { Item } from '@/lib/validations/todo'
import type { TodoActions } from '../state/useTodoActions'
import { PriorityFlag } from './PriorityFlag'

type RowMenuProps = {
  item: Item
  actions: TodoActions
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onAddChild: () => void
  /** Abre os detalhes (datas e repetição). */
  onDetails: () => void
  /** Abre o histórico só deste item. */
  onHistory: () => void
  /** Abre o seletor de "Mover para…". */
  onMoveTo: () => void
  /** Ordena os subitens por prazo (só faz sentido se há subitens). */
  onSortChildren?: () => void
}

/** Menu de ações da linha. Tudo o que o arrasto e os atalhos fazem também está aqui. */
export function RowMenu({
  item,
  actions,
  open,
  onOpenChange,
  onEdit,
  onAddChild,
  onDetails,
  onHistory,
  onMoveTo,
  onSortChildren,
}: RowMenuProps) {
  const t = useTranslations('todo')
  const label = t('row.menu', { text: item.text })

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label={label}
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'text-muted-foreground'
              )}
            >
              <Icon icon="lucide:ellipsis" className="size-4" aria-hidden />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="top">{t('row.menuShort')}</TooltipContent>
      </Tooltip>
      {/* Por quê: o menu é renderizado num portal, mas o clique ainda borbulha pela árvore do React até
          a linha — sem isto, escolher um item do menu também marcaria/desmarcaria a tarefa. */}
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="min-w-48"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={onEdit}>
          <Icon icon="lucide:pencil" aria-hidden />
          {t('menu.edit')}
          <DropdownMenuShortcut>F2</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddChild}>
          <Icon icon="lucide:corner-down-right" aria-hidden />
          {t('menu.addChild')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDetails}>
          <Icon icon="lucide:calendar-clock" aria-hidden />
          {t('menu.details')}
          <DropdownMenuShortcut>D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Icon icon="lucide:flag" aria-hidden />
            {t('menu.priority')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={item.priority}
              onValueChange={(value) => actions.setPriority(item.id, value as Priority)}
            >
              {PRIORITIES.map((priority, index) => (
                <DropdownMenuRadioItem key={priority} value={priority}>
                  <PriorityFlag priority={priority} />
                  {t(`priority.${priority}`)}
                  <DropdownMenuShortcut className="pe-4">{index + 1}</DropdownMenuShortcut>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.moveUp(item.id)}>
          <Icon icon="lucide:arrow-up" aria-hidden />
          {t('menu.moveUp')}
          <DropdownMenuShortcut>Alt ↑</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.moveDown(item.id)}>
          <Icon icon="lucide:arrow-down" aria-hidden />
          {t('menu.moveDown')}
          <DropdownMenuShortcut>Alt ↓</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.indent(item.id)}>
          <Icon icon="lucide:indent-increase" aria-hidden />
          {t('menu.indent')}
          <DropdownMenuShortcut>Alt →</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.outdent(item.id)}>
          <Icon icon="lucide:indent-decrease" aria-hidden />
          {t('menu.outdent')}
          <DropdownMenuShortcut>Alt ←</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMoveTo}>
          <Icon icon="lucide:corner-down-right" aria-hidden />
          {t('menu.moveTo')}
        </DropdownMenuItem>
        {onSortChildren && (
          <DropdownMenuItem onClick={onSortChildren}>
            <Icon icon="lucide:arrow-down-wide-narrow" aria-hidden />
            {t('menu.sortByDue')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onHistory}>
          <Icon icon="lucide:history" aria-hidden />
          {t('menu.history')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => actions.remove(item.id)}>
          <Icon icon="lucide:trash-2" aria-hidden />
          {t('menu.delete')}
          <DropdownMenuShortcut>Del</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
