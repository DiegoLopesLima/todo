import { TODO_PERSIST_VERSION } from '@/constants/todo-storage'

/** Passo que leva o estado persistido da versão N para a N+1. */
type Migration = (state: unknown) => unknown

/**
 * Passos de migração, indexados pela versão de ORIGEM. Cada mudança de formato do documento
 * persistido acrescenta aqui o passo `N: (state) => estado da versão N+1` e sobe
 * `TODO_PERSIST_VERSION`. Hoje só existe a versão 1, então não há passos.
 */
const MIGRATIONS: Record<number, Migration> = {}

/**
 * Leva o estado salvo na versão `from` até a versão atual, encadeando os passos. Uma versão MAIS
 * nova que a atual (o usuário voltou para um app antigo) devolve o estado como está: quem lê valida
 * com o schema e, se não servir, preserva o conteúdo como cópia em vez de apagá-lo.
 */
export function migratePersisted(
  state: unknown,
  from: number,
  to: number = TODO_PERSIST_VERSION
): unknown {
  let current = state
  for (let version = from; version < to; version++) {
    const step = MIGRATIONS[version]
    if (!step) throw new Error(`Missing todo migration from version ${version}`)
    current = step(current)
  }
  return current
}
