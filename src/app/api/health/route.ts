import { NextResponse } from 'next/server'

// Por quê: `dynamic` força a leitura a cada chamada — um health check cacheado responderia "ok"
// para sempre, mesmo com o processo degradado, e deixaria de servir ao monitor que o consome.
export const dynamic = 'force-dynamic'
export const maxDuration = 10

/** Liveness probe: responde 200 enquanto o processo está de pé. Não toca em banco nem em terceiros. */
export function GET() {
  return NextResponse.json({ status: 'ok' })
}
