// Service worker do app de tarefas: faz o app abrir SEM internet depois da primeira visita.
//
// Estratégia (ver docs/modules/todo/context-pwa.md):
//   - Navegação (HTML por idioma): rede primeiro, com tempo limite; se a rede falha, serve o último
//     HTML guardado. Assim um deploy novo vale assim que há rede, e offline abre a versão anterior.
//   - /_next/static/* (nomes com hash do conteúdo => imutáveis): cache primeiro, guardados para
//     sempre (com poda por quantidade), sem versão — um deploy novo não invalida o HTML antigo de
//     uma aba que ficou aberta, que continua achando seus próprios arquivos.
//   - Ícones e manifesto: cache primeiro.
//   - Todo o resto (requisições RSC, /api, outras origens, não-GET): passa direto, sem cache.
//
// Suba VERSION só quando a LÓGICA deste arquivo mudar: isso descarta o cache de HTML antigo.

const VERSION = 'v1'
const SHELL_CACHE = `shell-${VERSION}`
const STATIC_CACHE = 'static-assets'
const LOCALES = ['pt-BR', 'en']
const DEFAULT_LOCALE = LOCALES[0]
const SHELL_URLS = LOCALES.map((locale) => `/${locale}`)
const STATIC_PREFIX = '/_next/static/'
const ICON_URLS = ['/manifest.webmanifest', '/icon.svg', '/api/pwa-icon/192', '/api/pwa-icon/512']
const LAST_LOCALE_KEY = '/__last-locale__'
const NAVIGATION_TIMEOUT_MS = 4000
const MAX_STATIC_ENTRIES = 400
const STATIC_URL_PATTERN = /\/_next\/static\/[^"'\s\\)]+/g

/** Chave de cache de uma navegação: o caminho, sem query (a visão e a busca vivem em `?v=&q=`). */
function pageKey(url) {
  return new Request(new URL(url.pathname, url.origin).href)
}

function localeOf(pathname) {
  const first = pathname.split('/')[1]
  return LOCALES.includes(first) ? first : null
}

/** Rede com tempo limite: se demorar demais, desiste e deixa o cache responder. */
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    fetch(request).then(
      (response) => {
        clearTimeout(timer)
        resolve(response)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/** Guarda um asset estático e poda os mais antigos acima do limite. */
async function putStatic(request, response) {
  const cache = await caches.open(STATIC_CACHE)
  await cache.put(request, response)
  const keys = await cache.keys()
  const excess = keys.length - MAX_STATIC_ENTRIES
  for (let i = 0; i < excess; i++) await cache.delete(keys[i])
}

/** Baixa os arquivos de `/_next/static/` que um HTML referencia, para o app abrir offline. */
async function precacheAssetsOf(html) {
  const urls = new Set(html.match(STATIC_URL_PATTERN) || [])
  await Promise.all(
    [...urls].map(async (path) => {
      try {
        const request = new Request(path)
        if (await caches.match(request)) return
        const response = await fetch(request)
        if (response.ok) await putStatic(request, response)
      } catch (_error) {
        // Um asset que não baixou vira cache-miss depois; não impede instalar o resto.
      }
    })
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE)
      await Promise.all(
        [...SHELL_URLS, ...ICON_URLS].map(async (path) => {
          try {
            const response = await fetch(new Request(path, { cache: 'reload' }))
            if (!response.ok || response.redirected) return
            if (SHELL_URLS.includes(path)) await precacheAssetsOf(await response.clone().text())
            await shell.put(path, response)
          } catch (_error) {
            // Sem rede na instalação: o cache se enche conforme a pessoa navega.
          }
        })
      )
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name !== SHELL_CACHE && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

/**
 * Guarda o HTML de uma navegação bem-sucedida (e os arquivos que ele usa) para o modo offline.
 *
 * Por quê: a resposta é copiada para uma `Response` nova. Uma resposta que passou por redirecionamento
 * (`/` → `/pt-BR`) tem `redirected: true`, e o navegador RECUSA entregá-la de volta a uma navegação.
 */
async function remember(shell, response, finalUrl, locale) {
  const clean = new Response(await response.blob(), {
    status: response.status,
    headers: response.headers,
  })
  const html = await clean.clone().text()
  await shell.put(pageKey(finalUrl), clean)
  await shell.put(LAST_LOCALE_KEY, new Response(locale))
  await precacheAssetsOf(html)
}

/** Navegação: rede primeiro; offline, o HTML guardado do mesmo caminho ou o do último idioma visitado. */
async function handleNavigation(event) {
  const { request } = event
  const url = new URL(request.url)
  const shell = await caches.open(SHELL_CACHE)

  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
    const finalUrl = new URL(response.url || request.url)
    const locale = localeOf(finalUrl.pathname)
    if (response.ok && locale) event.waitUntil(remember(shell, response.clone(), finalUrl, locale))
    return response
  } catch (_error) {
    const cached = await shell.match(pageKey(url))
    if (cached) return cached
    const remembered = await shell.match(LAST_LOCALE_KEY)
    const locale = remembered ? await remembered.text() : DEFAULT_LOCALE
    const fallback = await shell.match(new Request(new URL(`/${locale}`, url.origin).href))
    return (
      fallback ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    )
  }
}

/** Cache primeiro; no miss busca na rede e guarda. */
async function cacheFirst(request, store) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    if (store === 'static') await putStatic(request, copy)
    else await (await caches.open(SHELL_CACHE)).put(request, copy)
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Requisições do roteador do Next (RSC) não são páginas: sempre rede.
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return

  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(cacheFirst(request, 'static'))
    return
  }

  if (ICON_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, 'shell'))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
  }
})
