'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PRIORITIES, type Priority } from '@/enums/todo'
import { isMacPlatform } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { PriorityFlag } from '../list/PriorityFlag'
import type { ReturnFocus } from './schedule'

type PriorityMenuProps = {
  value: Priority
  onChange: (priority: Priority) => void
  /** Para onde o foco volta ao fechar (o campo de texto: a pessoa quer seguir digitando). */
  returnFocusTo: ReturnFocus
}

/**
 * A prioridade como um menu dentro do campo de criação: mostra a atual (Normal por padrão) e abre a
 * lista ao clicar. No celular só a bandeira; do `md` em diante, também o nome.
 */
export function PriorityMenu({ value, onChange, returnFocusTo }: PriorityMenuProps) {
  const t = useTranslations('todo')
  const name = t(`priority.${value}`)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label={t('quickAdd.priorityAria', { name })}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 px-2')}
            >
              <PriorityFlag priority={value} />
              <span className="hidden text-xs md:inline">{name}</span>
              <Icon
                icon="lucide:chevron-down"
                className="hidden size-3 opacity-60 md:block"
                aria-hidden
              />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="top">
          <span className="flex items-center gap-2">
            {t('priority.label')}
            <KbdGroup>
              <Kbd>{isMacPlatform() ? '⌥' : 'Alt'}</Kbd>
              <Kbd>1–4</Kbd>
            </KbdGroup>
          </span>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-44" finalFocus={returnFocusTo}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            const chosen = PRIORITIES.find((option) => option === next)
            if (chosen) onChange(chosen)
          }}
        >
          {PRIORITIES.map((option, index) => (
            <DropdownMenuRadioItem key={option} value={option} className="gap-2">
              <PriorityFlag priority={option} />
              {t(`priority.${option}`)}
              <DropdownMenuShortcut className="pe-4">
                <Kbd>!{index + 1}</Kbd>
              </DropdownMenuShortcut>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
