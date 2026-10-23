import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderResult, render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactElement } from 'react'
import { formats } from '@/i18n/formats'
import messages from '../../messages/pt-BR.json'

type IntlOptions = { searchParams?: string | Record<string, string>; hasMemory?: boolean }

/** The provider stack every component under test needs; see {@link renderWithIntl}. */
function IntlProviders({
  queryClient,
  options,
  children,
}: {
  queryClient: QueryClient
  options?: IntlOptions
  children: ReactElement
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsTestingAdapter searchParams={options?.searchParams} hasMemory={options?.hasMemory}>
        <NextIntlClientProvider locale="pt-BR" messages={messages} formats={formats}>
          {children}
        </NextIntlClientProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  )
}

/**
 * Renders a component wrapped in the next-intl provider with the real pt-BR messages, so
 * `useTranslations`/`useLocale` resolve exactly as in the app — plus a per-render TanStack
 * `QueryClientProvider` and the nuqs testing adapter, so any URL-state control renders without a
 * real router. Pass `searchParams` (a query string or a plain object) to simulate arriving with
 * query params already in the URL, e.g. a deep link.
 *
 * `hasMemory` defaults to unset (the adapter's own default, `false`): a write updates that hook's
 * own local value but the adapter's shared snapshot never advances past the initial
 * `searchParams`. Pass `hasMemory: true` for a test whose component writes query state and then
 * depends on that write sticking across further renders.
 *
 * `rerender` is overridden to re-wrap its argument: RTL's own `rerender` would drop the providers
 * and make `useTranslations` throw. (The stack is applied this way instead of through RTL's
 * `wrapper` option because a wrapper component would have to be defined inside this function to
 * capture `options`.)
 */
export function renderWithIntl(ui: ReactElement, options?: IntlOptions) {
  // A fresh TanStack client per render (retries off, so a failing read settles at once) — created
  // once here, so a `rerender` keeps the same cache.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  })
  const wrap = (node: ReactElement) => (
    <IntlProviders queryClient={queryClient} options={options}>
      {node}
    </IntlProviders>
  )
  const result = render(wrap(ui))
  return { ...result, rerender: (next: ReactElement) => result.rerender(wrap(next)) } as Omit<
    RenderResult,
    'rerender'
  > & { rerender: (next: ReactElement) => void }
}

export { messages }
