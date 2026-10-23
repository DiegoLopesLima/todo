'use client'

import { useLocale } from 'next-intl'
import { useTransition } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/** Flag icon (Iconify `circle-flags`) per supported locale. Add the flag to `lib/icon-data` too. */
export const LOCALE_FLAGS: Record<string, string> = {
  'pt-BR': 'circle-flags:br',
  en: 'circle-flags:us',
}

/** The supported locales, in routing order. */
export const LOCALES = routing.locales

/**
 * Language-selection logic behind {@link LocaleSwitcher}: re-renders the current path under the
 * chosen locale, preserving the route. To also remember the choice for signed-in users, call a
 * Server Action from `selectLocale` (see `docs/recipes/auth.md`).
 */
export function useLocaleChoice() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function selectLocale(next: string) {
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return { locale, isPending, selectLocale }
}
