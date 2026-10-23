/**
 * @jest-environment node
 */
import { ImageResponse } from 'next/og'

import { PWA_ICON_PIXELS, PWA_ICON_SIZES } from '@/constants/pwa'
import * as route from './route'

jest.mock('next/og', () => ({
  ImageResponse: jest
    .fn()
    .mockImplementation(
      (_element: unknown, options: { headers?: Record<string, string> }) =>
        new Response('png', { status: 200, headers: options.headers })
    ),
}))

const call = (size: string) =>
  route.GET(new Request(`http://localhost/api/pwa-icon/${size}`), {
    params: Promise.resolve({ size }),
  })

beforeEach(() => jest.mocked(ImageResponse).mockClear())

it('é estática e declara um teto de duração, como toda rota', () => {
  expect(route.dynamic).toBe('force-static')
  expect(route.maxDuration).toBeGreaterThan(0)
})

it('gera um ícone para cada tamanho do manifesto', () => {
  expect(route.generateStaticParams()).toEqual(PWA_ICON_SIZES.map((size) => ({ size })))
})

it.each(PWA_ICON_SIZES)(
  'desenha o ícone %s no tamanho certo e o deixa em cache para sempre',
  async (size) => {
    const response = await call(size)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('immutable')
    expect(jest.mocked(ImageResponse).mock.calls[0][1]).toMatchObject({
      width: PWA_ICON_PIXELS[size],
      height: PWA_ICON_PIXELS[size],
    })
  }
)

it.each(['64', 'huge', '../etc', ''])(
  'recusa o tamanho inválido %j com o corpo de erro padrão',
  async (size) => {
    const response = await call(size)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'invalid_size' })
    expect(ImageResponse).not.toHaveBeenCalled()
  }
)
