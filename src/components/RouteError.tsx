'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/PageContainer'
import { Button } from '@/components/ui/button'

/**
 * The body of every `error.tsx` route boundary: a localized "something went wrong" with a retry
 * and, when Next gave one, the error `digest` — the id that finds the matching server-side log.
 *
 * `variant="shell"` is for a boundary that renders **inside** the dashboard shell (sidebar stays,
 * the page gets the usual `PageContainer`); `"page"` is the public, full-width surface.
 *
 * Por quê: sem `error.tsx`, qualquer exceção de renderização caía na tela de erro genérica do Next
 * (em produção, sem texto, sem tradução, sem como tentar de novo).
 */
export function RouteError({
  error,
  onRetry,
  variant,
}: {
  error: Error & { digest?: string }
  onRetry: () => void
  variant: 'shell' | 'page'
}) {
  const t = useTranslations('ErrorPage')
  const tCommon = useTranslations('common')

  useEffect(() => {
    console.error('[route-error]', error.digest ?? '', error)
  }, [error])

  const reference = error.digest ? (
    <span className="block font-mono text-xs">{t('reference', { digest: error.digest })}</span>
  ) : null
  const description = (
    <>
      {t('description')}
      {reference}
    </>
  )
  const retry = (
    <Button type="button" onClick={onRetry} className="gap-2">
      <Icon icon="lucide:refresh-cw" className="size-4" aria-hidden />
      {tCommon('retry')}
    </Button>
  )

  if (variant === 'shell') {
    return (
      <PageContainer>
        <EmptyState
          icon="lucide:triangle-alert"
          title={t('title')}
          description={description}
          action={retry}
        />
      </PageContainer>
    )
  }

  return (
    <section
      role="alert"
      className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center"
    >
      <Icon icon="lucide:triangle-alert" className="size-10 text-destructive" aria-hidden />
      <h1 className="mt-6 text-balance font-semibold text-2xl tracking-tight sm:text-3xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">{description}</p>
      <div className="mt-8">{retry}</div>
    </section>
  )
}
