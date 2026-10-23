'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

import type { DropTarget } from '@/lib/todo/drop'
import { cn } from '@/lib/utils'
import type { Item } from '@/lib/validations/todo'
import { PriorityFlag } from './PriorityFlag'

type DragPreviewProps = {
  item: Item
  /** Quantos subitens vão junto. */
  carried: number
  /** Para onde vai cair, se o ponto atual for válido. */
  target: DropTarget | null
  /** Texto do novo pai (quando vai para dentro de outro item). */
  parentText: string | null
}

/**
 * O que acompanha o ponteiro durante o arrasto: o item, o recuo em que vai cair e — o que importa —
 * a prioridade que ele vai ter e o pai, para a pessoa saber o resultado antes de soltar.
 */
export function DragPreview({ item, carried, target, parentText }: DragPreviewProps) {
  const t = useTranslations('todo.drag')
  const tp = useTranslations('todo.priority')
  return (
    <div
      className={cn(
        'flex w-72 max-w-[80vw] flex-col gap-1 rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-lg',
        target === null && 'border-destructive/50 opacity-80'
      )}
    >
      <span className="truncate font-medium">{item.text}</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
        {target === null ? (
          <span className="flex items-center gap-1 text-destructive-foreground">
            <Icon icon="lucide:circle-alert" className="size-3.5" aria-hidden />
            {t('invalid')}
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <PriorityFlag priority={target.priority} />
              {tp(target.priority)}
            </span>
            <span className="flex items-center gap-1">
              <Icon icon="lucide:corner-down-right" className="size-3.5" aria-hidden />
              {parentText ? t('inside', { text: parentText }) : t('topLevel')}
            </span>
          </>
        )}
        {carried > 0 && <span>{t('carried', { count: carried })}</span>}
      </span>
    </div>
  )
}
