import { createTodoSync } from '@/services/todo-sync'
import { FakeBroadcastChannel, installFakeBroadcastChannel } from '@/test/broadcast-channel'

describe('createTodoSync', () => {
  let restore: () => void
  beforeEach(() => {
    restore = installFakeBroadcastChannel()
  })
  afterEach(() => restore())

  it('entrega a revisão às outras abas, e não a quem publicou', () => {
    const tabA = createTodoSync('test-channel')
    const tabB = createTodoSync('test-channel')
    const fromA = jest.fn()
    const fromB = jest.fn()
    tabA.subscribe(fromA)
    tabB.subscribe(fromB)

    tabA.publish(7)

    expect(fromB).toHaveBeenCalledWith(7)
    expect(fromA).not.toHaveBeenCalled()
  })

  it('cancelar a inscrição para de receber', () => {
    const tabA = createTodoSync('test-channel')
    const tabB = createTodoSync('test-channel')
    const listener = jest.fn()
    const unsubscribe = tabB.subscribe(listener)
    unsubscribe()
    tabA.publish(1)
    expect(listener).not.toHaveBeenCalled()
  })

  it('ignora mensagens que não trazem uma revisão numérica', () => {
    const sync = createTodoSync('test-channel')
    const listener = jest.fn()
    sync.subscribe(listener)
    const stranger = new FakeBroadcastChannel('test-channel')
    stranger.postMessage({ rev: 'x' })
    stranger.postMessage(null)
    stranger.postMessage({})
    expect(listener).not.toHaveBeenCalled()
  })

  it('canais com nomes diferentes não se misturam', () => {
    const one = createTodoSync('canal-1')
    const two = createTodoSync('canal-2')
    const listener = jest.fn()
    two.subscribe(listener)
    one.publish(1)
    expect(listener).not.toHaveBeenCalled()
  })

  it('sem BroadcastChannel não faz nada e não lança', () => {
    restore()
    const original = globalThis.BroadcastChannel
    // @ts-expect-error simulando um navegador sem BroadcastChannel
    delete globalThis.BroadcastChannel
    try {
      const sync = createTodoSync('test-channel')
      expect(() => sync.publish(1)).not.toThrow()
      const unsubscribe = sync.subscribe(jest.fn())
      expect(() => unsubscribe()).not.toThrow()
    } finally {
      globalThis.BroadcastChannel = original
    }
  })
})
