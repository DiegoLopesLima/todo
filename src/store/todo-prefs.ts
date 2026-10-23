import { create } from 'zustand'
import { type PersistStorage, persist } from 'zustand/middleware'

import { TODO_IDB_PREFS_KEY } from '@/constants/todo-storage'
import type { DateKey } from '@/lib/todo/dates'
import { createIdbStorage } from '@/services/todo-storage'

/** O que é persistido das preferências. */
export type PersistedPrefs = {
  collapsed: Record<string, true>
  confetti: boolean
  celebratedDay: DateKey | null
  hasSeenHelp: boolean
}

export type TodoPrefsState = PersistedPrefs & {
  hydrated: boolean
  toggleCollapsed: (id: string) => void
  setConfetti: (enabled: boolean) => void
  markDayCelebrated: (day: DateKey) => void
  markHelpSeen: () => void
}

const DEFAULTS: PersistedPrefs = {
  collapsed: {},
  confetti: true,
  celebratedDay: null,
  hasSeenHelp: false,
}

/**
 * Cria a store de preferências de interface (itens recolhidos, confete, celebração do dia).
 * Ficam fora do documento de propósito: não entram no desfazer nem no histórico.
 *
 * `storage` é injetável para os testes; em produção é o IndexedDB do app.
 */
export function createTodoPrefsStore(storage: PersistStorage<PersistedPrefs>) {
  return create<TodoPrefsState>()(
    persist(
      (set) => ({
        ...DEFAULTS,
        hydrated: false,

        toggleCollapsed: (id) =>
          set((state) => {
            const collapsed = { ...state.collapsed }
            if (collapsed[id]) delete collapsed[id]
            else collapsed[id] = true
            return { collapsed }
          }),
        setConfetti: (confetti) => set({ confetti }),
        markDayCelebrated: (celebratedDay) => set({ celebratedDay }),
        markHelpSeen: () => set({ hasSeenHelp: true }),
      }),
      {
        name: TODO_IDB_PREFS_KEY,
        storage,
        skipHydration: true,
        partialize: ({ collapsed, confetti, celebratedDay, hasSeenHelp }) => ({
          collapsed,
          confetti,
          celebratedDay,
          hasSeenHelp,
        }),
      }
    )
  )
}

/** O storage das preferências — exposto para o `flush` ao esconder a aba. */
export const todoPrefsStorage = createIdbStorage<PersistedPrefs>()

export const useTodoPrefs = createTodoPrefsStore(todoPrefsStorage)
