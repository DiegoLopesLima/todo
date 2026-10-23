import { SERVICE_WORKER_PATH } from '@/constants/pwa'
import { registerServiceWorker } from '@/lib/pwa/register'

function stubServiceWorker(register: jest.Mock | undefined) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: register ? { register } : undefined,
    configurable: true,
  })
}

afterEach(() => {
  // @ts-expect-error o jsdom não define `serviceWorker`: restaura o estado original
  delete navigator.serviceWorker
})

describe('registerServiceWorker', () => {
  it('registra /sw.js na raiz, sem deixar o navegador guardar o próprio worker', async () => {
    const registration = { scope: '/' }
    const register = jest.fn().mockResolvedValue(registration)
    stubServiceWorker(register)

    await expect(registerServiceWorker({ enabled: true })).resolves.toBe(registration)
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_PATH, {
      scope: '/',
      updateViaCache: 'none',
    })
  })

  it('só registra em produção por padrão (em teste/dev não registra)', async () => {
    const register = jest.fn()
    stubServiceWorker(register)
    await expect(registerServiceWorker()).resolves.toBeNull()
    expect(register).not.toHaveBeenCalled()
  })

  it('devolve null onde não há suporte', async () => {
    await expect(registerServiceWorker({ enabled: true })).resolves.toBeNull()
  })

  it('devolve null se o registro falha — o app funciona igual, só sem o modo offline', async () => {
    stubServiceWorker(jest.fn().mockRejectedValue(new Error('bloqueado')))
    await expect(registerServiceWorker({ enabled: true })).resolves.toBeNull()
  })
})
