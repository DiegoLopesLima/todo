/** Caminho do service worker, servido de `public/sw.js`. */
export const SERVICE_WORKER_PATH = '/sw.js'

/** Fundo da tela de abertura do app instalado. */
export const PWA_BACKGROUND_COLOR = '#ffffff'

/** Descrição do app no manifesto (o manifesto é único, então fica em português). */
export const PWA_DESCRIPTION = 'Checklist hierárquico para o dia a dia. Funciona sem internet.'

/** Tamanhos de ícone gerados por `/api/pwa-icon/<tamanho>`; `maskable` é o ícone com margem de segurança. */
export const PWA_ICON_SIZES = ['192', '512', 'maskable'] as const
export type PwaIconSize = (typeof PWA_ICON_SIZES)[number]

/** Lado, em pixels, de cada ícone. */
export const PWA_ICON_PIXELS: Record<PwaIconSize, number> = {
  '192': 192,
  '512': 512,
  maskable: 512,
}
