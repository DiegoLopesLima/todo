import 'fake-indexeddb/auto'

import { waitFor } from '@testing-library/react'
import { createStore, keys, set } from 'idb-keyval'
import type { StorageValue } from 'zustand/middleware'

import { TODO_IDB_CORRUPT_PREFIX } from '@/constants/todo-storage'
import { createIdbStorage, createMemoryStorage } from '@/services/todo-storage'

type Doc = { rev: number; label: string }
type Value = StorageValue<{ doc: Doc }>

const value = (rev: number, label = `v${rev}`): Value => ({
  state: { doc: { rev, label } },
  version: 1,
})
const getRev = (v: Value) => v.state.doc.rev

let counter = 0
const freshStore = () => createStore(`todo-test-${counter++}`, 'keyval')

describe('createIdbStorage', () => {
  it('grava e lê de volta', async () => {
    const storage = createIdbStorage<{ doc: Doc }>({ store: freshStore(), getRev })
    storage.setItem('k', value(1))
    await storage.flush()
    expect(await storage.getItem('k')).toEqual(value(1))
  })

  it('lê null quando não há nada salvo', async () => {
    const storage = createIdbStorage<{ doc: Doc }>({ store: freshStore() })
    expect(await storage.getItem('k')).toBeNull()
  })

  it('removeItem apaga', async () => {
    const storage = createIdbStorage<{ doc: Doc }>({ store: freshStore() })
    storage.setItem('k', value(1))
    await storage.flush()
    await storage.removeItem('k')
    expect(await storage.getItem('k')).toBeNull()
  })

  it('agrupa gravações seguidas numa só, com o valor mais recente', async () => {
    const onWritten = jest.fn()
    const store = freshStore()
    const storage = createIdbStorage<{ doc: Doc }>({
      store,
      getRev,
      onWritten,
      debounceMs: 20,
      maxWaitMs: 200,
    })
    storage.setItem('k', value(1))
    storage.setItem('k', value(2))
    storage.setItem('k', value(3))
    await waitFor(() => expect(onWritten).toHaveBeenCalled())
    expect(onWritten).toHaveBeenCalledTimes(1)
    expect(onWritten).toHaveBeenCalledWith(3)
    expect(await storage.getItem('k')).toEqual(value(3))
  })

  it('o teto de espera força a gravação mesmo com mudanças contínuas', async () => {
    const onWritten = jest.fn()
    const storage = createIdbStorage<{ doc: Doc }>({
      store: freshStore(),
      getRev,
      onWritten,
      debounceMs: 50,
      maxWaitMs: 60,
    })
    let rev = 0
    const tick = setInterval(() => storage.setItem('k', value(++rev)), 20)
    await waitFor(() => expect(onWritten).toHaveBeenCalled(), { timeout: 2000 })
    clearInterval(tick)
    await storage.flush()
  })

  it('não regrava a mesma revisão', async () => {
    const onWritten = jest.fn()
    const storage = createIdbStorage<{ doc: Doc }>({ store: freshStore(), getRev, onWritten })
    storage.setItem('k', value(1))
    await storage.flush()
    storage.setItem('k', value(1))
    await storage.flush()
    expect(onWritten).toHaveBeenCalledTimes(1)
  })

  it('descarta a gravação quando outra aba já gravou uma revisão mais nova', async () => {
    const store = freshStore()
    const otherTab = createIdbStorage<{ doc: Doc }>({ store, getRev })
    otherTab.setItem('k', value(5, 'da outra aba'))
    await otherTab.flush()

    const onConflict = jest.fn()
    const onWritten = jest.fn()
    const thisTab = createIdbStorage<{ doc: Doc }>({ store, getRev, onConflict, onWritten })
    thisTab.setItem('k', value(3, 'desta aba'))
    await thisTab.flush()

    expect(onConflict).toHaveBeenCalledTimes(1)
    expect(onWritten).not.toHaveBeenCalled()
    expect(await thisTab.getItem('k')).toEqual(value(5, 'da outra aba'))
  })

  it('sem getRev grava sempre (preferências)', async () => {
    const storage = createIdbStorage<{ doc: Doc }>({ store: freshStore() })
    storage.setItem('k', value(1))
    await storage.flush()
    storage.setItem('k', value(1, 'outro'))
    await storage.flush()
    expect(await storage.getItem('k')).toEqual(value(1, 'outro'))
  })

  describe('valor salvo inválido', () => {
    it('é preservado como cópia, avisado e tratado como ausente', async () => {
      const store = freshStore()
      await set('k', { state: 'lixo', version: 1 }, store)
      const onCorrupt = jest.fn()
      const storage = createIdbStorage<{ doc: Doc }>({
        store,
        validate: (v) => typeof v.state === 'object',
        onCorrupt,
      })
      expect(await storage.getItem('k')).toBeNull()
      expect(onCorrupt).toHaveBeenCalledWith({ state: 'lixo', version: 1 })
      const all = await keys(store)
      expect(all.some((key) => String(key).startsWith(TODO_IDB_CORRUPT_PREFIX))).toBe(true)
    })

    it('um valor válido passa', async () => {
      const store = freshStore()
      await set('k', value(1), store)
      const storage = createIdbStorage<{ doc: Doc }>({ store, validate: () => true })
      expect(await storage.getItem('k')).toEqual(value(1))
    })
  })

  describe('falhas do armazenamento', () => {
    const broken = (() => Promise.reject(new Error('boom'))) as unknown as ReturnType<
      typeof createStore
    >

    it('se a leitura falha, avisa e RECUSA gravar depois — para não sobrescrever o que existe', async () => {
      const onError = jest.fn()
      const storage = createIdbStorage<{ doc: Doc }>({ store: broken, getRev, onError })
      expect(await storage.getItem('k')).toBeNull()
      expect(onError).toHaveBeenCalledWith('unavailable', expect.any(Error))

      const onWritten = jest.fn()
      const guarded = createIdbStorage<{ doc: Doc }>({ store: broken, getRev, onError, onWritten })
      await guarded.getItem('k')
      guarded.setItem('k', value(1))
      await guarded.flush()
      expect(onWritten).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith('write', expect.any(Error))
    })

    it('uma gravação que falha é reportada e tentada de novo no próximo flush', async () => {
      const store = freshStore()
      const onError = jest.fn()
      const onWritten = jest.fn()
      const storage = createIdbStorage<{ doc: Doc }>({ store, getRev, onError, onWritten })
      // Valor que o IndexedDB não consegue clonar: a gravação falha.
      storage.setItem('k', {
        state: { doc: { rev: 1, label: () => {} } },
        version: 1,
      } as unknown as Value)
      await storage.flush()
      expect(onError).toHaveBeenCalledWith('write', expect.anything())
      expect(onWritten).not.toHaveBeenCalled()
    })
  })

  describe('sem IndexedDB', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')

    afterEach(() => {
      if (original) Object.defineProperty(globalThis, 'indexedDB', original)
    })

    it('cai para memória e avisa que não está salvando', async () => {
      Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true })
      const onError = jest.fn()
      const storage = createIdbStorage<{ doc: Doc }>({ onError })

      expect(await storage.getItem('k')).toBeNull()
      storage.setItem('k', value(1))
      expect(await storage.getItem('k')).toEqual(value(1))
      expect(onError).toHaveBeenCalledWith('unavailable', expect.any(Error))
      await storage.removeItem('k')
      expect(await storage.getItem('k')).toBeNull()
    })
  })
})

describe('createMemoryStorage', () => {
  it('guarda, lê e remove', () => {
    const storage = createMemoryStorage<{ doc: Doc }>({ k: value(1) })
    expect(storage.getItem('k')).toEqual(value(1))
    storage.setItem('j', value(2))
    expect(storage.entries.get('j')).toEqual(value(2))
    storage.removeItem('k')
    expect(storage.getItem('k')).toBeNull()
  })
})
