import { GLOBAL_ERROR_COPY, type GlobalErrorCopy } from '@/constants/global-error-copy'
import { routing } from '@/i18n/routing'

/**
 * The copy for the locale named by the URL's first path segment (`/en/...`), falling back to the
 * default locale — `global-error` has no router, no provider and no props to tell it the locale.
 */
export function resolveGlobalErrorCopy(pathname: string | null | undefined): GlobalErrorCopy {
  const segment = pathname?.split('/')[1]
  const locale = routing.locales.find((candidate) => candidate === segment)
  return GLOBAL_ERROR_COPY[locale ?? routing.defaultLocale]
}
