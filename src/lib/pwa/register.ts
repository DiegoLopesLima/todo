import { SERVICE_WORKER_PATH } from '@/constants/pwa'

/**
 * Registra o service worker do app (o que o faz abrir sem internet). Só em produção: em
 * desenvolvimento um SW em cache atrapalha mais do que ajuda (HMR, páginas antigas). Devolve `null`
 * onde não há suporte ou o registro falhou — o app funciona igual, só sem o modo offline.
 *
 * `updateViaCache: 'none'` faz o navegador conferir a versão do próprio `sw.js` a cada visita.
 */
export async function registerServiceWorker(
  options: { enabled?: boolean } = {}
): Promise<ServiceWorkerRegistration | null> {
  const enabled = options.enabled ?? process.env.NODE_ENV === 'production'
  if (!enabled || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
      scope: '/',
      updateViaCache: 'none',
    })
  } catch {
    return null
  }
}
