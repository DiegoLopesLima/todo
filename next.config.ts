import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const projectRoot = dirname(fileURLToPath(import.meta.url))

const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), usb=()'

const nextConfig: NextConfig = {
  // Não anuncia o framework em cada resposta (`X-Powered-By: Next.js`): informação de graça para
  // quem procura versão vulnerável.
  poweredByHeader: false,
  // Dev tools / on-screen indicator desabilitado — debug feito via assistente.
  devIndicators: false,
  // Pin Turbopack's workspace root to THIS project. Otherwise Next walks up and, on Windows, finds
  // an unrelated lockfile (e.g. C:\Users\<user>\yarn.lock), infers the wrong root, and warns
  // ("multiple lockfiles … inferred your workspace root"). Pinning it silences the warning and
  // keeps `.next`/env resolution anchored to the repo.
  turbopack: { root: projectRoot },
  experimental: {
    // Since Next 16.1, Turbopack persists its dev cache to `.next/cache` across dev-server restarts
    // by default. On Next 16.2.x it corrupts (see vercel/next.js#87283) and causes routes to 404
    // intermittently in a way a restart alone does NOT fix, since the whole point of the cache is
    // to survive restarts — only deleting `.next` clears a bad entry. Disabling it trades a bit of
    // warm-start speed for not hunting phantom 404s. Revisit once upstream marks it stable.
    turbopackFileSystemCacheForDev: false,
  },
  // Baseline security headers. The app denies framing outright. A full Content-Security-Policy
  // (`script-src` etc.) is intentionally absent: it would need per-request nonces and risk breaking
  // third-party scripts and dev HMR — revisit separately if ever needed. Without a nonce,
  // `script-src` would have to accept `'unsafe-inline'` and would not stop an injected `onerror=`,
  // so the defense against stored XSS stays sanitizing on write. What is set here does not depend
  // on a nonce: `frame-ancestors`, `base-uri` (stops an injected `<base>` from redirecting relative
  // links) and `object-src 'none'` (no plugins).
  //
  // `Permissions-Policy` closes the device APIs the app doesn't use (camera, microphone,
  // geolocation, USB): if a feature ever needs one, open it here.
  //
  // `Strict-Transport-Security` is harmless in local dev: browsers ignore the header entirely over
  // plain HTTP. No `preload` — that is a one-way, browser-vendor-level commitment for the whole
  // domain and is the operator's call, not a config default.
  headers: async () => [
    {
      // Por quê: o service worker nunca pode ficar em cache — é ele quem decide o que o app serve
      // offline, e um `sw.js` velho preso no cache do navegador atrasaria toda correção dele. O
      // `Content-Type` explícito evita que o navegador recuse registrá-lo por MIME errado.
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
        },
        { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ],
    },
  ],
}

export default withNextIntl(nextConfig)
