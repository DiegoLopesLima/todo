import { create } from 'zustand'

import type { Celebration } from '@/lib/todo/commands'
import { type DateKey, toDateKey } from '@/lib/todo/dates'
import type { StorageErrorKind } from '@/services/todo-storage'

/** Uma celebração a exibir; `id` muda a cada uma para o efeito rodar de novo mesmo repetindo o tipo. */
export type CelebrationEvent = { id: number; kind: Celebration; itemId: string | null }

type TodoUiState = {
  /** O "hoje" do app, atualizado na virada do dia. */
  today: DateKey
  /** Por que o app não está conseguindo salvar (a pessoa precisa saber e exportar). */
  persistError: StorageErrorKind | null
  /** Outra aba gravou algo mais novo e esta recarregou (aviso de uma vez). */
  syncedFromOtherTab: boolean
  /** Os dados salvos estavam corrompidos; o conteúdo cru foi preservado. */
  corruptData: boolean
  /** O conteúdo cru que não passou na validação (para a pessoa baixar uma cópia). */
  corruptRaw: unknown
  /** Diálogos abertos — enquanto > 0 os atalhos globais (desfazer) ficam quietos. */
  modalCount: number
  /** Itens recém-concluídos que ainda ocupam o lugar de abertos (a pausa antes de afundar). */
  recentlyDone: Record<string, number>
  celebration: CelebrationEvent | null
  /** Texto para a região `aria-live`; `id` muda a cada anúncio para repetir a mesma frase ser lido de novo. */
  announcement: { id: number; text: string } | null

  setToday: (today: DateKey) => void
  setPersistError: (error: StorageErrorKind | null) => void
  setSyncedFromOtherTab: (value: boolean) => void
  setCorruptData: (value: boolean, raw?: unknown) => void
  openModal: () => void
  closeModal: () => void
  holdOpen: (ids: readonly string[], until: number) => void
  releaseHold: (ids: readonly string[]) => void
  celebrate: (kind: Celebration, itemId: string | null) => void
  announce: (text: string) => void
}

let celebrationCounter = 0
let announcementCounter = 0

/**
 * Estado efêmero compartilhado entre partes não relacionadas da tela (cabeçalho, lista, atalhos,
 * avisos). Nada aqui é persistido. Foco, edição inline e arrasto ficam locais nos componentes.
 */
export const useTodoUi = create<TodoUiState>()((set) => ({
  today: toDateKey(new Date()),
  persistError: null,
  syncedFromOtherTab: false,
  corruptData: false,
  corruptRaw: null,
  modalCount: 0,
  recentlyDone: {},
  celebration: null,
  announcement: null,

  setToday: (today) => set((state) => (state.today === today ? state : { today })),
  setPersistError: (persistError) => set({ persistError }),
  setSyncedFromOtherTab: (syncedFromOtherTab) => set({ syncedFromOtherTab }),
  setCorruptData: (corruptData, raw = null) =>
    set({ corruptData, corruptRaw: corruptData ? raw : null }),
  openModal: () => set((state) => ({ modalCount: state.modalCount + 1 })),
  closeModal: () => set((state) => ({ modalCount: Math.max(0, state.modalCount - 1) })),
  holdOpen: (ids, until) =>
    set((state) => {
      const recentlyDone = { ...state.recentlyDone }
      for (const id of ids) recentlyDone[id] = until
      return { recentlyDone }
    }),
  releaseHold: (ids) =>
    set((state) => {
      const recentlyDone = { ...state.recentlyDone }
      for (const id of ids) delete recentlyDone[id]
      return { recentlyDone }
    }),
  celebrate: (kind, itemId) => set({ celebration: { id: ++celebrationCounter, kind, itemId } }),
  announce: (text) => set({ announcement: { id: ++announcementCounter, text } }),
}))
