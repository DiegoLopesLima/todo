import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

import type { Priority } from '@/enums/todo'
import { cn } from '@/lib/utils'

const COLOR: Record<Priority, string> = {
  p1: 'text-priority-1',
  p2: 'text-priority-2',
  p3: 'text-priority-3',
  p4: 'text-priority-4',
}

/** Bandeira colorida da prioridade, com o nome para leitor de tela. */
export function PriorityFlag({ priority, className }: { priority: Priority; className?: string }) {
  const t = useTranslations('todo.priority')
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center transition-colors duration-200 motion-reduce:transition-none',
        COLOR[priority],
        className
      )}
    >
      <Icon icon="lucide:flag" className="size-3.5" aria-hidden />
      <span className="sr-only">{t(priority)}</span>
    </span>
  )
}
