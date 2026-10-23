import { Icon } from '@iconify/react'
import type { ReactNode } from 'react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'

export type EmptyStateProps = {
  /** Optional Iconify icon id (e.g. `lucide:inbox`) shown above/beside the title. */
  icon?: string
  /** Already-localized headline. */
  title: ReactNode
  /** Already-localized supporting line. */
  description?: ReactNode
  /** Optional trailing call-to-action (e.g. a `Button`). */
  action?: ReactNode
  /**
   * `card` (default) — the prominent borderless box for a page/section's main empty area.
   * `plain` — a compact muted line for dense contexts (panels, timelines, list rows).
   */
  variant?: 'card' | 'plain'
  className?: string
}

/**
 * The one empty state used everywhere a list/section has no data. Built on the
 * `ui/empty` primitive so every "no data" surface reads the same. `card` renders the
 * box with a muted icon circle; `plain` renders a borderless muted line for tight
 * contexts. Copy is passed in already-translated.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'card',
  className,
}: EmptyStateProps) {
  if (variant === 'plain') {
    return (
      <Empty
        className={cn(
          'flex-none flex-row flex-wrap gap-2 rounded-lg border-0 px-3 py-8 text-muted-foreground',
          className
        )}
      >
        {icon && <Icon icon={icon} className="size-4 shrink-0" aria-hidden />}
        <EmptyTitle className="font-normal text-muted-foreground text-sm">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
        {action && <EmptyContent className="mt-1 w-auto">{action}</EmptyContent>}
      </Empty>
    )
  }

  return (
    <Empty className={cn('gap-3 px-6 py-12', className)}>
      <EmptyHeader>
        {icon && (
          <EmptyMedia variant="icon" className="size-12 rounded-full">
            <Icon icon={icon} className="size-6" aria-hidden />
          </EmptyMedia>
        )}
        <EmptyTitle className="font-medium text-foreground text-sm">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
