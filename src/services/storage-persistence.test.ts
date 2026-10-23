import { estimateStorage, requestPersistentStorage } from '@/services/storage-persistence'

function stubStorage(storage: unknown) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

describe('storage-persistence', () => {
  afterEach(() => {
    // @ts-expect-error restaura o estado do jsdom, que não define `navigator.storage`
    delete navigator.storage
  })

  describe('requestPersistentStorage', () => {
    it('devolve null onde a API não existe', async () => {
      expect(await requestPersistentStorage()).toBeNull()
    })

    it('não pede de novo se já é persistente', async () => {
      const persist = jest.fn()
      stubStorage({ persisted: async () => true, persist })
      expect(await requestPersistentStorage()).toBe(true)
      expect(persist).not.toHaveBeenCalled()
    })

    it('pede e devolve a resposta do navegador', async () => {
      stubStorage({ persisted: async () => false, persist: async () => true })
      expect(await requestPersistentStorage()).toBe(true)
      stubStorage({ persist: async () => false })
      expect(await requestPersistentStorage()).toBe(false)
    })

    it('devolve null se a API lança', async () => {
      stubStorage({
        persist: async () => {
          throw new Error('negado')
        },
      })
      expect(await requestPersistentStorage()).toBeNull()
    })
  })

  describe('estimateStorage', () => {
    it('devolve uso e cota', async () => {
      stubStorage({ estimate: async () => ({ usage: 10, quota: 100 }) })
      expect(await estimateStorage()).toEqual({ usage: 10, quota: 100 })
    })

    it('devolve null sem a API, sem os números ou se lança', async () => {
      expect(await estimateStorage()).toBeNull()
      stubStorage({ estimate: async () => ({}) })
      expect(await estimateStorage()).toBeNull()
      stubStorage({
        estimate: async () => {
          throw new Error('x')
        },
      })
      expect(await estimateStorage()).toBeNull()
    })
  })
})
