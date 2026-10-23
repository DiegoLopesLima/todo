import { type DateKey, toDateKey } from '@/lib/todo/dates'
import { newId } from '@/lib/todo/ids'

/**
 * O que o domínio puro precisa do mundo: o instante, o dia local e a fábrica de ids. Injetar isto —
 * em vez de chamar `Date.now()` ou `crypto` no meio da regra — é o que torna o domínio determinístico
 * e testável.
 */
export type Ctx = {
  now: Date
  today: DateKey
  newId: () => string
}

/** Contexto de produção para um instante (padrão: agora). */
export function makeCtx(now: Date = new Date()): Ctx {
  return { now, today: toDateKey(now), newId }
}

/** ISO 8601 do instante do contexto — o carimbo de `createdAt`, `updatedAt` e `completedAt`. */
export function isoNow(ctx: Ctx): string {
  return ctx.now.toISOString()
}
