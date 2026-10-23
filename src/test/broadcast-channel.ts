type Listener = (event: MessageEvent) => void

const channels = new Map<string, Set<FakeBroadcastChannel>>()

/**
 * `BroadcastChannel` falso (o jsdom não tem): entrega a mensagem às OUTRAS instâncias do mesmo
 * canal, de forma síncrona e sem o eco para quem enviou — como o real.
 */
export class FakeBroadcastChannel {
  private listeners = new Set<Listener>()

  constructor(readonly name: string) {
    const group = channels.get(name) ?? new Set()
    group.add(this)
    channels.set(name, group)
  }

  postMessage(data: unknown): void {
    for (const other of channels.get(this.name) ?? []) {
      if (other === this) continue
      for (const listener of other.listeners) listener({ data } as MessageEvent)
    }
  }

  addEventListener(_type: 'message', listener: Listener): void {
    this.listeners.add(listener)
  }

  removeEventListener(_type: 'message', listener: Listener): void {
    this.listeners.delete(listener)
  }

  close(): void {
    channels.get(this.name)?.delete(this)
  }
}

/** Instala o canal falso como global; devolve a função que restaura o original. */
export function installFakeBroadcastChannel(): () => void {
  const original = globalThis.BroadcastChannel
  channels.clear()
  globalThis.BroadcastChannel = FakeBroadcastChannel as unknown as typeof BroadcastChannel
  return () => {
    globalThis.BroadcastChannel = original
    channels.clear()
  }
}
