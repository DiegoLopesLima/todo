import type { DateKey } from '@/lib/todo/dates'

const HEX_RADIX = 16
const BYTE_LENGTH = 16
const UUID_VERSION_BYTE = 6
const UUID_VARIANT_BYTE = 8

/** Formato aceito para o id-base de um item ou série (UUID); barra nomes perigosos como `__proto__`. */
export const BASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Formato completo de um id: base, ou base + data de ocorrência (+ índice de filho). */
export const ITEM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:\d{4}-\d{2}-\d{2}(:\d+)?)?$/

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-')
}

/**
 * Gera um UUID v4. Usa `crypto.randomUUID` quando existe e cai para `getRandomValues`.
 *
 * Por quê: `randomUUID` só existe em contexto seguro (HTTPS ou localhost); abrir o app por IP na rede
 * local, em http, quebraria a criação de itens.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(BYTE_LENGTH))
  bytes[UUID_VERSION_BYTE] = (bytes[UUID_VERSION_BYTE] & 0x0f) | 0x40
  bytes[UUID_VARIANT_BYTE] = (bytes[UUID_VARIANT_BYTE] & 0x3f) | 0x80
  return formatUuid(bytes)
}

/** Id determinístico de uma ocorrência: gerar duas vezes o mesmo dia da mesma série não duplica. */
export function occurrenceId(seriesId: string, date: DateKey): string {
  return `${seriesId}:${date}`
}

/** Id determinístico do filho de índice `n` (ordem em profundidade) de uma ocorrência. */
export function occurrenceChildId(occurrence: string, n: number): string {
  return `${occurrence}:${n}`
}

/** `true` se o id tem o formato válido para um item ou série. */
export function isValidItemId(id: string): boolean {
  return ITEM_ID_PATTERN.test(id)
}
