'use client'

import { useEffect } from 'react'

import { useTodoUi } from '@/store/todo-ui'

/**
 * Registra que um diálogo/painel está aberto enquanto `open` for `true`. Os atalhos globais
 * (desfazer, refazer, busca) ficam quietos nesse intervalo: dentro de um diálogo, Ctrl+Z é do campo.
 */
export function useModalOpen(open: boolean): void {
  useEffect(() => {
    if (!open) return
    useTodoUi.getState().openModal()
    return () => useTodoUi.getState().closeModal()
  }, [open])
}
