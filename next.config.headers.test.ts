/**
 * @jest-environment node
 */
import nextConfig from './next.config'

/**
 * Guards the baseline security headers. The failure it prevents is silent: if a refactor drops
 * `X-Frame-Options` or the `frame-ancestors` directive, nothing else in the suite notices and the
 * app becomes frameable. Production behavior on the hosting platform (where `headers()` becomes
 * build-output `routes`) is platform behavior these tests can't reach — verify with `curl -I`
 * against a preview deploy.
 */

type HeaderEntry = { source: string; headers: { key: string; value: string }[] }

async function getHeaderEntries(): Promise<HeaderEntry[]> {
  const headers = await nextConfig.headers?.()
  return (headers ?? []) as HeaderEntry[]
}

function headerValue(entry: HeaderEntry, key: string): string | undefined {
  return entry.headers.find((h) => h.key === key)?.value
}

/** A entrada que vale para todas as rotas (a linha de base de segurança). */
async function baselineEntry(): Promise<HeaderEntry> {
  const entry = (await getHeaderEntries()).find((candidate) => candidate.source === '/(.*)')
  if (!entry) throw new Error('baseline security headers entry is missing')
  return entry
}

describe('security headers', () => {
  it('applies one baseline entry to every route', async () => {
    const entries = (await getHeaderEntries()).filter((entry) => entry.source === '/(.*)')

    expect(entries).toHaveLength(1)
  })

  it('denies framing, both the legacy way and through CSP', async () => {
    const entry = await baselineEntry()

    expect(headerValue(entry, 'X-Frame-Options')).toBe('DENY')
    expect(headerValue(entry, 'Content-Security-Policy')).toContain("frame-ancestors 'none'")
  })

  it('sets the remaining hardening headers', async () => {
    const entry = await baselineEntry()

    expect(headerValue(entry, 'X-Content-Type-Options')).toBe('nosniff')
    expect(headerValue(entry, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headerValue(entry, 'Strict-Transport-Security')).toContain('includeSubDomains')
    expect(headerValue(entry, 'Permissions-Policy')).toContain('camera=()')
  })

  it('does not advertise the framework', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
  })
})

describe('service worker headers', () => {
  async function swEntry(): Promise<HeaderEntry> {
    const entry = (await getHeaderEntries()).find((candidate) => candidate.source === '/sw.js')
    if (!entry) throw new Error('service worker headers entry is missing')
    return entry
  }

  it('never lets the browser cache the worker, or a fix to it would be stuck behind a stale copy', async () => {
    const entry = await swEntry()

    expect(headerValue(entry, 'Cache-Control')).toBe('no-cache, no-store, must-revalidate')
  })

  it('serves it as JavaScript', async () => {
    expect(headerValue(await swEntry(), 'Content-Type')).toBe(
      'application/javascript; charset=utf-8'
    )
  })
})
