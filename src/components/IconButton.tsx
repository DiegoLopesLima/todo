'use client'

import { Icon } from '@iconify/react'
import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type IconButtonProps = Omit<ComponentProps<typeof Button>, 'children' | 'aria-label'> & {
  /** Iconify id (ex.: `lucide:undo-2`). Precisa estar no registro offline (`@/lib/icons`). */
  icon: string
  /** O nome da ação, já traduzido: vira o `aria-label` e o tooltip. */
  label: string
  /** Lado do tooltip. */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Classes extras do ícone (rotação, cor…). */
  iconClassName?: string
  /** Teclas do atalho, mostradas no tooltip (ex.: `['⌘', 'Z']`). */
  shortcut?: readonly ReactNode[]
}

/**
 * Botão que só tem ícone: o nome da ação vai no `aria-label` (para leitor de tela) e no `Tooltip`
 * (para quem enxerga) — as duas coisas que a regra de UI exige.
 */
export function IconButton({
  icon,
  label,
  side = 'bottom',
  iconClassName,
  shortcut,
  variant = 'ghost',
  size = 'icon',
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant={variant} size={size} aria-label={label} {...props}>
            <Icon icon={icon} className={cn('size-4', iconClassName)} aria-hidden />
          </Button>
        }
      />
      <TooltipContent side={side}>
        <span className="flex items-center gap-2">
          {label}
          {shortcut && shortcut.length > 0 && (
            <KbdGroup>
              {shortcut.map((key, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: as teclas de um atalho são fixas e podem repetir
                <Kbd key={index}>{key}</Kbd>
              ))}
            </KbdGroup>
          )}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
