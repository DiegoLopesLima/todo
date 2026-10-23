import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Edge entry point (Next 16 `proxy`, formerly `middleware`). Today it only negotiates the locale
 * prefix. When authentication is added, the access rule belongs in a pure `resolveAuthGate`
 * (`@/lib/auth-gate`) that this file converts into a response — see `docs/recipes/auth.md`.
 */
export default createMiddleware(routing)

export const config = {
  // Everything except API routes, Next internals and files with an extension (assets).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
