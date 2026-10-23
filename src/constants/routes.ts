/**
 * Locale-agnostic route prefixes (paths AFTER the `/{locale}` segment). The locale prefix is added
 * by next-intl; never hard-code it here.
 */

/**
 * Pages that require an authenticated session. Every private page lives under the single
 * `/dashboard` prefix, so one entry gates the whole authenticated area — `matchesRoute` matches the
 * prefix and all of its sub-routes. Never add private paths outside `/dashboard`.
 *
 * Nothing consumes this until authentication is added ([receita](../../docs/recipes/auth.md)); it
 * is declared now so a private page is born under the right prefix.
 */
export const PROTECTED_ROUTES = ['/dashboard'] as const

/** Whether `pathname` (already locale-stripped) matches one of `prefixes`. */
export function matchesRoute(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
