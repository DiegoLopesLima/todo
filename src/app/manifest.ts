import type { MetadataRoute } from 'next'

import { APP_NAME, THEME_COLOR } from '@/constants/app'
import { PWA_BACKGROUND_COLOR, PWA_DESCRIPTION } from '@/constants/pwa'

/**
 * Manifesto do app instalável. É único (não há um por idioma), por isso o texto fica em português
 * e `start_url` é a raiz — o proxy leva ao idioma da pessoa. O nome do app instalado segue o
 * manifesto, não o idioma da interface (limitação documentada em `docs/modules/todo`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: PWA_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    lang: 'pt-BR',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/api/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/pwa-icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
