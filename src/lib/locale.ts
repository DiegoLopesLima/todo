import { routing } from '@/i18n/routing'

/**
 * Coerces an arbitrary string into a *supported* locale. Returns `locale` when it is one of the
 * configured locales; otherwise `fallback` (when that is itself supported), and finally the
 * default locale. Use it whenever a locale comes from an untrusted or nullable source (a DB
 * column, a form field, a stored preference) before passing it to `getTranslations` or building
 * a URL.
 */
export function toSupportedLocale(
  locale: string | null | undefined,
  fallback: string = routing.defaultLocale
): string {
  const supported = routing.locales as readonly string[]
  if (locale && supported.includes(locale)) return locale
  if (fallback && supported.includes(fallback)) return fallback
  return routing.defaultLocale
}
