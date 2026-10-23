'use client'

import { RouteError } from '@/components/RouteError'

/** Route boundary for the whole `[locale]` tree. A segment with its own shell can add its own. */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <RouteError error={error} onRetry={unstable_retry} variant="page" />
}
