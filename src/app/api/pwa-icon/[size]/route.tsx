import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { THEME_COLOR } from '@/constants/app'
import { PWA_ICON_PIXELS, PWA_ICON_SIZES } from '@/constants/pwa'

// Por quê: os ícones só dependem do tamanho, então são gerados uma vez no build e servidos como
// estáticos (e o service worker os guarda para o app instalado abrir offline).
export const dynamic = 'force-static'
export const maxDuration = 10

const paramsSchema = z.object({ size: z.enum(PWA_ICON_SIZES) })

export function generateStaticParams() {
  return PWA_ICON_SIZES.map((size) => ({ size }))
}

/** Margem em volta do "✓" no ícone mascarável: o sistema recorta até ~20% das bordas. */
const MASKABLE_SCALE = 0.62
const ANY_SCALE = 0.78
/** Cantos arredondados do ícone comum (o mascarável vai até a borda, o sistema o recorta). */
const ANY_RADIUS = '22%'

/** `GET /api/pwa-icon/<192|512|maskable>` — o ícone PNG do app, desenhado na hora do build. */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_size' }, { status: 404 })

  const { size } = parsed.data
  const pixels = PWA_ICON_PIXELS[size]
  const maskable = size === 'maskable'
  const mark = Math.round(pixels * (maskable ? MASKABLE_SCALE : ANY_SCALE))

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: THEME_COLOR,
        borderRadius: maskable ? 0 : ANY_RADIUS,
      }}
    >
      <svg width={mark} height={mark} viewBox="0 0 512 512">
        <title>check</title>
        <path
          d="M142 268l78 78 150-170"
          fill="none"
          stroke="#ffffff"
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    {
      width: pixels,
      height: pixels,
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    }
  )
}
