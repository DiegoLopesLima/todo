import { createStore, del, get, set, type UseStore, update } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

import {
  TODO_IDB_CORRUPT_PREFIX,
  TODO_IDB_NAME,
  TODO_IDB_STORE,
  TODO_WRITE_DEBOUNCE_MS,
  TODO_WRITE_MAX_WAIT_MS,
} from '@/constants/todo-storage'

/** Por que uma gravação não aconteceu. */
export type StorageErrorKind = 'unavailable' | 'quota' | 'write'

export type IdbStorageOptions<S> = {
  /** Banco a usar; por padrão o do app, aberto sob demanda. Os testes injetam um isolado. */
  store?: UseStore
  /** Revisão do valor. Habilita o guard contra sobrescrever uma gravação mais nova de outra aba. */
  getRev?: (value: StorageValue<S>) => number
  /** Um valor lido que não passa aqui é guardado como cópia crua e tratado como ausente. */
  validate?: (value: StorageValue<S>) => boolean
  debounceMs?: number
  maxWaitMs?: number
  /** Outra aba gravou uma revisão mais nova: esta gravação foi descartada. */
  onConflict?: () => void
  /** Gravou com sucesso a revisão informada. */
  onWritten?: (rev: number) => void
  onError?: (kind: StorageErrorKind, error: unknown) => void
  /** O valor salvo estava inválido; recebe o conteúdo cru que foi preservado. */
  onCorrupt?: (raw: unknown) => void
}

export type IdbStorage<S> = PersistStorage<S> & {
  /** Grava agora o que estiver pendente (ao esconder a aba, por exemplo). */
  flush: () => Promise<void>
}

let sharedStore: UseStore | undefined

/** O banco do app, aberto na primeira necessidade (nunca no servidor, onde não há IndexedDB). */
function getSharedStore(): UseStore {
  sharedStore ??= createStore(TODO_IDB_NAME, TODO_IDB_STORE)
  return sharedStore
}

function errorKind(error: unknown): StorageErrorKind {
  return error instanceof DOMException && error.name === 'QuotaExceededError' ? 'quota' : 'write'
}

/** Storage em memória — para testes e como destino quando o IndexedDB não existe. */
export function createMemoryStorage<S>(
  initial: Record<string, StorageValue<S>> = {}
): PersistStorage<S> & {
  entries: Map<string, StorageValue<S>>
} {
  const entries = new Map(Object.entries(initial))
  return {
    entries,
    getItem: (name) => entries.get(name) ?? null,
    setItem: (name, value) => {
      entries.set(name, value)
    },
    removeItem: (name) => {
      entries.delete(name)
    },
  }
}

/**
 * Storage do `persist` do Zustand sobre IndexedDB.
 *
 * - Grava com debounce (e um teto de espera), numa transação única que confere a revisão: se outra
 *   aba já gravou uma mais nova, esta gravação é descartada em vez de sobrescrevê-la.
 * - Um valor salvo inválido não é apagado: vira uma cópia sob `todo:corrupt:<instante>`.
 * - Sem IndexedDB (navegação privada de alguns navegadores, SSR), cai para memória e avisa por
 *   `onError('unavailable')` — o app segue funcionando, só que sem salvar.
 *
 * @see todo-document — a store que o consome
 */
export function createIdbStorage<S>(options: IdbStorageOptions<S> = {}): IdbStorage<S> {
  const debounceMs = options.debounceMs ?? TODO_WRITE_DEBOUNCE_MS
  const maxWaitMs = options.maxWaitMs ?? TODO_WRITE_MAX_WAIT_MS
  const fallback = createMemoryStorage<S>()
  const available = options.store !== undefined || typeof indexedDB !== 'undefined'

  let pending: { name: string; value: StorageValue<S> } | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let firstPendingAt = 0
  let lastWrittenRev = -1
  let writing: Promise<void> = Promise.resolve()

  const store = () => options.store ?? getSharedStore()

  // Por quê: avisa a CADA operação, não uma vez só — o aviso na tela é um estado (o erro atual), e
  // quem o limpa (uma gravação bem-sucedida) precisa poder vê-lo voltar se o problema persistir.
  const reportUnavailable = () => {
    options.onError?.('unavailable', new Error('IndexedDB is not available'))
  }

  // Por quê: se a LEITURA falhou, a store subiu vazia — gravar agora sobrescreveria os dados reais
  // com uma lista em branco assim que o IndexedDB voltasse a responder. Melhor recusar a gravação
  // (e avisar) do que perder tudo em silêncio.
  let readFailed = false

  async function write(name: string, value: StorageValue<S>): Promise<void> {
    if (readFailed) throw new Error('Refusing to write after a failed read')
    const rev = options.getRev?.(value)
    let conflicted = false
    await update<StorageValue<S>>(
      name,
      (old) => {
        if (rev !== undefined && old && options.getRev && options.getRev(old) > rev) {
          conflicted = true
          return old
        }
        return value
      },
      store()
    )
    if (conflicted) {
      options.onConflict?.()
      return
    }
    if (rev !== undefined) lastWrittenRev = rev
    options.onWritten?.(rev ?? 0)
  }

  const flush = (): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    const job = pending
    pending = null
    firstPendingAt = 0
    if (!job) return writing
    writing = writing
      .then(() => write(job.name, job.value))
      .catch((error: unknown) => {
        options.onError?.(errorKind(error), error)
        // Mantém o valor para a próxima tentativa, a menos que já exista um mais novo.
        pending ??= job
      })
    return writing
  }

  return {
    flush,

    async getItem(name) {
      if (!available) {
        reportUnavailable()
        return fallback.getItem(name)
      }
      let raw: StorageValue<S> | undefined
      try {
        raw = await get<StorageValue<S>>(name, store())
        readFailed = false
      } catch (error) {
        readFailed = true
        options.onError?.('unavailable', error)
        return null
      }
      if (raw === undefined) return null
      if (options.validate && !options.validate(raw)) {
        try {
          await set(`${TODO_IDB_CORRUPT_PREFIX}${Date.now()}`, raw, store())
        } catch (error) {
          options.onError?.(errorKind(error), error)
        }
        options.onCorrupt?.(raw)
        return null
      }
      return raw
    },

    setItem(name, value) {
      if (!available) {
        reportUnavailable()
        fallback.setItem(name, value)
        return
      }
      const rev = options.getRev?.(value)
      // Por quê: o `persist` chama `setItem` a cada `set` — inclusive os que só mexem em pilhas de
      // desfazer ou no flag de hidratação, que não alteram o documento. A revisão sobe a cada
      // mudança real, então revisão igual = nada novo para gravar.
      if (rev !== undefined && rev === lastWrittenRev && pending === null) return
      pending = { name, value }
      const now = Date.now()
      if (firstPendingAt === 0) firstPendingAt = now
      clearTimeout(timer)
      const wait = Math.min(debounceMs, Math.max(0, maxWaitMs - (now - firstPendingAt)))
      timer = setTimeout(() => void flush(), wait)
    },

    async removeItem(name) {
      if (!available) {
        fallback.removeItem(name)
        return
      }
      try {
        await del(name, store())
      } catch (error) {
        options.onError?.('write', error)
      }
    },
  }
}
