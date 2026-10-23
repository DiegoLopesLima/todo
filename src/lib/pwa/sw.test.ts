/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'

const ORIGIN = 'http://localhost'
const SOURCE = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8')

type Snapshot = { body: string; status: number; headers: [string, string][] }

const urlOf = (input: unknown): string =>
  typeof input === 'string'
    ? new URL(input, ORIGIN).href
    : new URL((input as { url: string }).url, ORIGIN).href

class FakeCache {
  entries = new Map<string, Snapshot>()

  async put(request: unknown, response: Response) {
    this.entries.set(urlOf(request), {
      body: await response.text(),
      status: response.status,
      headers: [...response.headers.entries()],
    })
  }

  async match(request: unknown, options?: { ignoreSearch?: boolean }) {
    let key = urlOf(request)
    if (options?.ignoreSearch) key = key.split('?')[0]
    const entry = this.entries.get(key)
    return entry
      ? new Response(entry.body, { status: entry.status, headers: entry.headers })
      : undefined
  }

  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }))
  }

  async delete(request: unknown) {
    return this.entries.delete(urlOf(request))
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>()

  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache())
    return this.stores.get(name) as FakeCache
  }

  async match(request: unknown) {
    for (const store of this.stores.values()) {
      const found = await store.match(request)
      if (found) return found
    }
    return undefined
  }

  async keys() {
    return [...this.stores.keys()]
  }

  async delete(name: string) {
    return this.stores.delete(name)
  }
}

type Routes = Record<string, () => Response | Promise<Response>>

/** Carrega o sw.js real num sandbox com `caches`, `fetch` e `self` falsos. */
function loadWorker(routes: Routes = {}) {
  const listeners = new Map<string, (event: unknown) => void>()
  const caches = new FakeCacheStorage()
  const fetched: string[] = []
  const skipWaiting = jest.fn(async () => {})
  const claim = jest.fn(async () => {})

  class SWRequest extends Request {
    constructor(input: string | Request, init?: RequestInit) {
      super(typeof input === 'string' ? new URL(input, ORIGIN).href : input, init)
    }
  }

  const sandbox = {
    self: {
      addEventListener: (type: string, listener: (event: unknown) => void) =>
        listeners.set(type, listener),
      skipWaiting,
      clients: { claim },
      location: new URL(`${ORIGIN}/sw.js`),
    },
    caches,
    fetch: async (input: unknown) => {
      const key = new URL(urlOf(input)).pathname
      fetched.push(key)
      const route = routes[key]
      if (!route) throw new Error(`offline: ${key}`)
      return route()
    },
    Request: SWRequest,
    Response,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Promise,
  }
  vm.runInNewContext(SOURCE, sandbox)

  async function lifecycle(type: 'install' | 'activate') {
    const waiting: Promise<unknown>[] = []
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => waiting.push(promise) })
    await Promise.all(waiting)
  }

  /** Dispara um fetch; devolve a resposta se o worker a tratou, ou `null` se deixou passar. */
  async function request(
    path: string,
    init: { method?: string; mode?: string; headers?: Record<string, string>; origin?: string } = {}
  ) {
    const waiting: Promise<unknown>[] = []
    let responded: Promise<Response> | null = null
    const event = {
      request: {
        url: new URL(path, init.origin ?? ORIGIN).href,
        method: init.method ?? 'GET',
        mode: init.mode ?? 'cors',
        headers: new Headers(init.headers),
      },
      respondWith: (promise: Promise<Response>) => {
        responded = promise
      },
      waitUntil: (promise: Promise<unknown>) => waiting.push(promise),
    }
    listeners.get('fetch')?.(event)
    const response = responded ? await (responded as Promise<Response>) : null
    await Promise.all(waiting)
    return response
  }

  return { caches, fetched, skipWaiting, claim, lifecycle, request, routes }
}

const html = (...assets: string[]) =>
  new Response(
    `<html>${assets.map((asset) => `<script src="${asset}"></script>`).join('')}</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )

describe('service worker', () => {
  describe('install e activate', () => {
    it('guarda os HTMLs dos idiomas, os ícones e os arquivos que o HTML usa', async () => {
      const worker = loadWorker({
        '/pt-BR': () => html('/_next/static/chunks/pt.js', '/_next/static/css/app.css'),
        '/en': () => html('/_next/static/chunks/en.js'),
        '/manifest.webmanifest': () => new Response('{}'),
        '/icon.svg': () => new Response('<svg/>'),
        '/api/pwa-icon/192': () => new Response('png'),
        '/api/pwa-icon/512': () => new Response('png'),
        '/_next/static/chunks/pt.js': () => new Response('pt'),
        '/_next/static/css/app.css': () => new Response('css'),
        '/_next/static/chunks/en.js': () => new Response('en'),
      })

      await worker.lifecycle('install')

      const shell = await worker.caches.open('shell-v1')
      expect([...shell.entries.keys()].sort()).toEqual(
        [
          '/pt-BR',
          '/en',
          '/manifest.webmanifest',
          '/icon.svg',
          '/api/pwa-icon/192',
          '/api/pwa-icon/512',
        ]
          .map((path) => `${ORIGIN}${path}`)
          .sort()
      )
      const assets = await worker.caches.open('static-assets')
      expect([...assets.entries.keys()].sort()).toEqual(
        ['/_next/static/chunks/pt.js', '/_next/static/css/app.css', '/_next/static/chunks/en.js']
          .map((path) => `${ORIGIN}${path}`)
          .sort()
      )
      expect(worker.skipWaiting).toHaveBeenCalled()
    })

    it('instalar sem rede não falha: o cache se enche depois, navegando', async () => {
      const worker = loadWorker({})
      await expect(worker.lifecycle('install')).resolves.toBeUndefined()
      expect(worker.skipWaiting).toHaveBeenCalled()
    })

    it('activate apaga as versões antigas do cache de HTML e mantém os arquivos com hash', async () => {
      const worker = loadWorker()
      await worker.caches.open('shell-v0')
      await worker.caches.open('shell-v1')
      await worker.caches.open('static-assets')
      await worker.caches.open('outro')

      await worker.lifecycle('activate')

      expect(await worker.caches.keys()).toEqual(['shell-v1', 'static-assets'])
      expect(worker.claim).toHaveBeenCalled()
    })
  })

  describe('o que passa direto', () => {
    it.each([
      ['POST', '/pt-BR', { method: 'POST', mode: 'navigate' }],
      ['outra origem', '/pt-BR', { mode: 'navigate', origin: 'http://outro.com' }],
      ['requisição RSC', '/pt-BR', { mode: 'navigate', headers: { RSC: '1' } }],
      ['parâmetro _rsc', '/pt-BR?_rsc=abc', { mode: 'navigate' }],
      ['API', '/api/health', {}],
      ['imagem qualquer', '/foto.png', {}],
    ] as const)('não trata %s', async (_label, path, init) => {
      const worker = loadWorker({ [path.split('?')[0]]: () => new Response('x') })
      expect(await worker.request(path, init)).toBeNull()
    })
  })

  describe('arquivos de /_next/static', () => {
    it('vão à rede uma vez e depois saem do cache', async () => {
      const worker = loadWorker({ '/_next/static/chunks/a.js': () => new Response('js') })

      const first = await worker.request('/_next/static/chunks/a.js')
      const second = await worker.request('/_next/static/chunks/a.js')

      expect(await first?.text()).toBe('js')
      expect(await second?.text()).toBe('js')
      expect(worker.fetched.filter((path) => path.endsWith('a.js'))).toHaveLength(1)
    })

    it('funcionam offline depois de guardados', async () => {
      const routes: Routes = { '/_next/static/chunks/a.js': () => new Response('js') }
      const worker = loadWorker(routes)
      await worker.request('/_next/static/chunks/a.js')
      delete routes['/_next/static/chunks/a.js']

      expect(await (await worker.request('/_next/static/chunks/a.js'))?.text()).toBe('js')
    })

    it('não guardam resposta com erro', async () => {
      const worker = loadWorker({
        '/_next/static/chunks/missing.js': () => new Response('nope', { status: 404 }),
      })
      await worker.request('/_next/static/chunks/missing.js')
      const assets = await worker.caches.open('static-assets')
      expect(assets.entries.size).toBe(0)
    })

    it('poda os mais antigos acima do limite', async () => {
      const routes: Routes = {}
      for (let i = 0; i < 405; i++) routes[`/_next/static/chunks/${i}.js`] = () => new Response('x')
      const worker = loadWorker(routes)

      for (let i = 0; i < 405; i++) await worker.request(`/_next/static/chunks/${i}.js`)

      const assets = await worker.caches.open('static-assets')
      expect(assets.entries.size).toBe(400)
      expect(assets.entries.has(`${ORIGIN}/_next/static/chunks/0.js`)).toBe(false)
      expect(assets.entries.has(`${ORIGIN}/_next/static/chunks/404.js`)).toBe(true)
    })
  })

  describe('navegação', () => {
    const page =
      (assets: string[] = []) =>
      () =>
        html(...assets)

    it('online devolve a página da rede e guarda uma cópia (sem a query) para o offline', async () => {
      const routes: Routes = {
        '/pt-BR': page(['/_next/static/chunks/p.js']),
        '/_next/static/chunks/p.js': () => new Response('p'),
      }
      const worker = loadWorker(routes)

      const online = await worker.request('/pt-BR?v=all&q=abc', { mode: 'navigate' })
      expect(online?.status).toBe(200)

      delete routes['/pt-BR']
      const offline = await worker.request('/pt-BR?v=today', { mode: 'navigate' })
      expect(await offline?.text()).toContain('/_next/static/chunks/p.js')
    })

    it('guarda também os arquivos que a página usa, para abrir offline de verdade', async () => {
      const worker = loadWorker({
        '/pt-BR': page(['/_next/static/chunks/p.js']),
        '/_next/static/chunks/p.js': () => new Response('p'),
      })
      await worker.request('/pt-BR', { mode: 'navigate' })
      const assets = await worker.caches.open('static-assets')
      expect(assets.entries.has(`${ORIGIN}/_next/static/chunks/p.js`)).toBe(true)
    })

    it('offline, a raiz abre o último idioma visitado', async () => {
      const routes: Routes = { '/en': page(['/_next/static/chunks/en.js']) }
      const worker = loadWorker(routes)
      await worker.request('/en', { mode: 'navigate' })
      delete routes['/en']

      const offline = await worker.request('/', { mode: 'navigate' })

      expect(offline?.status).toBe(200)
      expect(await offline?.text()).toContain('en.js')
    })

    it('uma resposta que veio de redirecionamento é guardada limpa, pela URL final', async () => {
      const redirected = () => {
        const response = html()
        Object.defineProperty(response, 'redirected', { value: true })
        Object.defineProperty(response, 'url', { value: `${ORIGIN}/pt-BR` })
        return response
      }
      const routes: Routes = { '/': redirected }
      const worker = loadWorker(routes)

      await worker.request('/', { mode: 'navigate' })
      delete routes['/']

      const shell = await worker.caches.open('shell-v1')
      expect(shell.entries.has(`${ORIGIN}/pt-BR`)).toBe(true)
      const offline = await worker.request('/pt-BR', { mode: 'navigate' })
      // Uma Response reconstruída nunca é "redirected": o navegador a aceita como resposta de navegação.
      expect(offline?.redirected).toBe(false)
    })

    it('sem rede e sem nada guardado, responde 503 em vez de quebrar', async () => {
      const worker = loadWorker({})
      const response = await worker.request('/pt-BR', { mode: 'navigate' })
      expect(response?.status).toBe(503)
    })

    it('se a rede demora demais, usa o que está guardado', async () => {
      jest.useFakeTimers()
      try {
        const routes: Routes = { '/pt-BR': page(['/_next/static/chunks/p.js']) }
        const worker = loadWorker({
          ...routes,
          '/_next/static/chunks/p.js': () => new Response('p'),
        })
        await worker.request('/pt-BR', { mode: 'navigate' })

        worker.routes['/pt-BR'] = () => new Promise<Response>(() => {})
        const slow = worker.request('/pt-BR', { mode: 'navigate' })
        await jest.advanceTimersByTimeAsync(4001)

        expect(await (await slow)?.text()).toContain('p.js')
      } finally {
        jest.useRealTimers()
      }
    })

    it('não guarda resposta de erro do servidor', async () => {
      const worker = loadWorker({ '/pt-BR': () => new Response('erro', { status: 500 }) })
      await worker.request('/pt-BR', { mode: 'navigate' })
      const shell = await worker.caches.open('shell-v1')
      expect(shell.entries.size).toBe(0)
    })
  })

  describe('ícones e manifesto', () => {
    it('saem do cache depois da primeira vez', async () => {
      const worker = loadWorker({ '/icon.svg': () => new Response('<svg/>') })
      await worker.request('/icon.svg')
      await worker.request('/icon.svg')
      expect(worker.fetched.filter((path) => path === '/icon.svg')).toHaveLength(1)
    })
  })
})
