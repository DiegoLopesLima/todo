import { TODO_SYNC_CHANNEL } from '@/constants/todo-storage'

export type TodoSync = {
  /** Avisa as outras abas de que o documento chegou a esta revisão. */
  publish: (rev: number) => void
  /** Recebe a revisão anunciada por outra aba. Devolve o cancelamento. */
  subscribe: (listener: (rev: number) => void) => () => void
}

/**
 * Canal que avisa as abas abertas do app de que o documento mudou, para elas recarregarem. Sem
 * `BroadcastChannel` (navegadores antigos, SSR) não faz nada — o app ainda recarrega ao voltar o foco.
 *
 * Por quê: o canal só entrega a quem NÃO enviou, então uma aba nunca recebe o eco da própria gravação.
 */
export function createTodoSync(channelName: string = TODO_SYNC_CHANNEL): TodoSync {
  let channel: BroadcastChannel | null | undefined

  const open = (): BroadcastChannel | null => {
    if (channel === undefined) {
      channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName)
    }
    return channel
  }

  return {
    publish(rev) {
      open()?.postMessage({ rev })
    },
    subscribe(listener) {
      const current = open()
      if (!current) return () => {}
      const onMessage = (event: MessageEvent<{ rev?: unknown }>) => {
        if (typeof event.data?.rev === 'number') listener(event.data.rev)
      }
      current.addEventListener('message', onMessage)
      return () => current.removeEventListener('message', onMessage)
    },
  }
}
