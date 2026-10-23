'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

/**
 * Centered spinner used as the `loading.tsx` route-level fallback for slow,
 * dynamic segments (e.g. the database-backed `(protected)` area). Complements
 * the top {@link NavigationProgress} bar: the bar confirms the click instantly,
 * this fills the segment while the server renders. Stretches to fill its parent.
 */
export function RouteLoading() {
  const t = useTranslations('navigation')

  return (
    <div
      role="status"
      aria-label={t('loading')}
      className="flex flex-1 items-center justify-center p-12"
    >
      <Icon
        icon="lucide:loader-circle"
        className="size-6 animate-spin text-muted-foreground"
        aria-hidden
      />
      <span className="sr-only">{t('loading')}</span>
    </div>
  )
}
