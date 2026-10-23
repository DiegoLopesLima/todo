import { createTranslator } from 'next-intl'
import { toSupportedLocale } from '@/lib/locale'

type Messages = Record<string, unknown>

/**
 * A loosely-typed translator: the message catalog is loaded as JSON at runtime, so keys can't be
 * statically known here (unlike `getTranslations` in a request).
 */
export type StandaloneTranslator = (key: string, values?: Record<string, unknown>) => string

const cache = new Map<string, Messages>()

async function loadMessages(locale: string): Promise<Messages> {
  const cached = cache.get(locale)
  if (cached) return cached
  const messages = (await import(`../../messages/${locale}.json`)).default as Messages
  cache.set(locale, messages)
  return messages
}

/**
 * A next-intl translator for use **outside** a Next.js request scope — a background job, a script,
 * an email render — where `getTranslations` has no request config to read from. Loads the locale's
 * message catalog directly and builds a pure `createTranslator` (memoized per locale). Inside a
 * request, keep using `getTranslations`.
 */
export async function getStandaloneTranslator(
  locale: string,
  namespace: string
): Promise<StandaloneTranslator> {
  const resolved = toSupportedLocale(locale)
  const messages = await loadMessages(resolved)
  return createTranslator({
    locale: resolved,
    messages,
    namespace,
  }) as unknown as StandaloneTranslator
}
