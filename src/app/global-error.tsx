'use client'

import { useEffect } from 'react'
import { resolveGlobalErrorCopy } from '@/lib/global-error-copy'
import './globals.css'

/**
 * Last-resort boundary: renders only when the root layout itself throws, so it brings its own
 * `<html>`/`<body>` and can't use the i18n provider (see `GLOBAL_ERROR_COPY`). Anything below the
 * layout is caught by `[locale]/error.tsx` instead.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const copy = resolveGlobalErrorCopy(
    typeof window === 'undefined' ? null : window.location.pathname
  )

  useEffect(() => {
    console.error('[global-error]', error.digest ?? '', error)
  }, [error])

  return (
    <html lang={copy.locale}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <h1 className="font-semibold text-2xl tracking-tight">{copy.title}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">{copy.description}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-muted-foreground text-xs">
            {copy.reference.replace('{digest}', error.digest)}
          </p>
        )}
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-8 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
        >
          {copy.retry}
        </button>
      </body>
    </html>
  )
}
