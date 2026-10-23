/** Quanto do armazenamento do navegador o app usa e quanto ele permite. */
export type StorageEstimate = { usage: number; quota: number }

/**
 * Pede ao navegador que não apague os dados do app sozinho (o que ele faz sob pouco espaço).
 * Devolve `null` onde a API não existe; o resultado é uma dica, não uma garantia.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null
  try {
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

/** Uso e cota de armazenamento, ou `null` se o navegador não informa. */
export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const { usage, quota } = await navigator.storage.estimate()
    return usage === undefined || quota === undefined ? null : { usage, quota }
  } catch {
    return null
  }
}
