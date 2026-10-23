'use client'

import { useEffect } from 'react'

import { registerServiceWorker } from '@/lib/pwa/register'

/**
 * Registra o service worker quando a página termina de carregar (para não competir com o primeiro
 * render). Não renderiza nada.
 *
 * @see TodoApp — único consumidor
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (document.readyState === 'complete') {
      void registerServiceWorker()
      return
    }
    const onLoad = () => void registerServiceWorker()
    window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}
