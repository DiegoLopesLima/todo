import { APP_NAME, THEME_COLOR } from '@/constants/app'
import { PWA_ICON_SIZES } from '@/constants/pwa'
import manifest from './manifest'

describe('manifest', () => {
  const result = manifest()

  it('torna o app instalável em tela cheia, a partir da raiz', () => {
    expect(result).toMatchObject({
      name: APP_NAME,
      short_name: APP_NAME,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: THEME_COLOR,
    })
  })

  it('traz ícones PNG comuns e um mascarável (exigência de instalação)', () => {
    const png = (result.icons ?? []).filter((icon) => icon.type === 'image/png')
    expect(png.some((icon) => icon.sizes === '192x192')).toBe(true)
    expect(png.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any')).toBe(true)
    expect(png.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })

  it('cada ícone aponta para uma rota que existe', () => {
    const generated = (result.icons ?? [])
      .map((icon) => icon.src)
      .filter((src) => src.startsWith('/api/pwa-icon/'))
      .map((src) => src.replace('/api/pwa-icon/', ''))
    expect(generated.sort()).toEqual([...PWA_ICON_SIZES].sort())
  })
})
