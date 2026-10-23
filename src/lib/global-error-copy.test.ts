import { GLOBAL_ERROR_COPY } from '@/constants/global-error-copy'
import { routing } from '@/i18n/routing'
import { resolveGlobalErrorCopy } from '@/lib/global-error-copy'

it('has copy for every routing locale, with every field filled', () => {
  for (const locale of routing.locales) {
    const copy = GLOBAL_ERROR_COPY[locale]
    expect(copy.locale).toBe(locale)
    expect(copy.title).not.toBe('')
    expect(copy.description).not.toBe('')
    expect(copy.retry).not.toBe('')
    expect(copy.reference).toContain('{digest}')
  }
})

it('picks the locale from the first path segment', () => {
  expect(resolveGlobalErrorCopy('/en/dashboard/settings')).toBe(GLOBAL_ERROR_COPY.en)
  expect(resolveGlobalErrorCopy('/pt-BR/dashboard')).toBe(GLOBAL_ERROR_COPY['pt-BR'])
})

it('falls back to the default locale for an unknown or missing segment', () => {
  expect(resolveGlobalErrorCopy('/fr/x')).toBe(GLOBAL_ERROR_COPY[routing.defaultLocale])
  expect(resolveGlobalErrorCopy('/')).toBe(GLOBAL_ERROR_COPY[routing.defaultLocale])
  expect(resolveGlobalErrorCopy(null)).toBe(GLOBAL_ERROR_COPY[routing.defaultLocale])
})
