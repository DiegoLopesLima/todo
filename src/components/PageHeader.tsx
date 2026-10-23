'use client'

import { Icon } from '@iconify/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PageHeaderProps = {
  /** Iconify icon id shown in the tile (e.g. `lucide:settings`). */
  icon: string
  /** Already-localized page title (rendered as the page `h1`). */
  title: string
  /** Already-localized supporting line under the title. */
  subtitle?: string
  /** Optional element pinned to the header's trailing edge (e.g. a primary button). */
  action?: ReactNode
  className?: string
}

/**
 * Unified page header: an icon tile beside the title/subtitle, closed by a hairline divider that
 * separates the header from the content. Presentational and locale-agnostic: callers pass
 * already-translated strings (it is a client component only because it renders an Iconify icon).
 */
export function PageHeader({ icon, title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-1 border-border/60 border-b pb-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon icon={icon} className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-0.5">
            <h1 className="font-semibold text-xl tracking-tight sm:text-2xl">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
