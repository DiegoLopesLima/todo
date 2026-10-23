'use client'

import { type ReactNode, useEffect } from 'react'

import { useToday } from '@/hooks/useToday'
import { requestPersistentStorage } from '@/services/storage-persistence'
import { todoDocumentStorage, todoSync, useTodoDocument } from '@/store/todo-document'
import { todoPrefsStorage, useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'

/**
 * Liga o documento de tarefas ao navegador: hidrata as stores do IndexedDB, gera as ocorrências
 * recorrentes devidas (ao abrir, ao virar o dia, ao voltar à aba), acompanha mudanças feitas em outra
 * aba e grava o que estiver pendente quando a aba é escondida.
 *
 * Não renderiza nada além dos filhos; a interface mostra o esqueleto até `hydrated`.
 *
 * @see TodoApp — único consumidor
 */
export function TodoProvider({ children }: { children: ReactNode }) {
  const today = useToday()
  const hydrated = useTodoDocument((state) => state.hydrated)
  const hasItems = useTodoDocument((state) => Object.keys(state.doc.items).length > 0)

  // Hidratação: preferências primeiro (barato), depois o documento; então gera as ocorrências.
  useEffect(() => {
    let active = true
    void (async () => {
      await useTodoPrefs.persist.rehydrate()
      useTodoPrefs.setState({ hydrated: true })
      await useTodoDocument.persist.rehydrate()
      if (active) useTodoDocument.getState().materialize()
    })()
    return () => {
      active = false
    }
  }, [])

  // O dia mudou (ou a store acabou de hidratar): gera o que ficou devendo.
  useEffect(() => {
    useTodoUi.getState().setToday(today)
    if (hydrated) useTodoDocument.getState().materialize()
  }, [today, hydrated])

  // Voltar à aba, ao foco ou à rede também é motivo para conferir o dia.
  useEffect(() => {
    const materialize = () => {
      if (useTodoDocument.getState().hydrated) useTodoDocument.getState().materialize()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') materialize()
      else void Promise.all([todoDocumentStorage.flush(), todoPrefsStorage.flush()])
    }
    const flush = () => void Promise.all([todoDocumentStorage.flush(), todoPrefsStorage.flush()])
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', materialize)
    window.addEventListener('online', materialize)
    window.addEventListener('pageshow', materialize)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', materialize)
      window.removeEventListener('online', materialize)
      window.removeEventListener('pageshow', materialize)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // Outra aba gravou algo mais novo: recarrega (a pilha de desfazer desta aba deixa de valer).
  useEffect(
    () =>
      todoSync.subscribe((remoteRev) => {
        if (remoteRev <= useTodoDocument.getState().doc.rev) return
        useTodoUi.getState().setSyncedFromOtherTab(true)
        void useTodoDocument.persist.rehydrate()
      }),
    []
  )

  // Pede armazenamento persistente quando a pessoa passa a ter algo a perder.
  useEffect(() => {
    if (hasItems) void requestPersistentStorage()
  }, [hasItems])

  return children
}
