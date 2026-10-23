'use client'

import { createContext, useContext } from 'react'

import type { TodoActions } from '../state/useTodoActions'

/** Para onde a navegação por teclado leva o foco a partir de uma linha. */
export type RowNavigation = 'next' | 'prev' | 'first' | 'last' | 'parent' | 'firstChild'

/**
 * O que a lista oferece às linhas: ações, estado de foco/edição e os callbacks que só ela sabe
 * resolver (porque dependem da ordem das linhas). Fica num contexto para as linhas — que são muitas
 * e memoizadas — receberem uma referência estável em vez de uma dúzia de props.
 */
export type TodoListContextValue = {
  actions: TodoActions
  /** A linha que está na ordem de Tab (foco "rolante": a lista inteira é uma única parada). */
  tabbableId: string | null
  editingId: string | null
  /** Há um arrasto em andamento: as linhas param de animar o próprio layout para não brigar com ele. */
  dragging: boolean
  /** Dá para arrastar agora (não durante uma busca, quando a ordem visível não é a da árvore). */
  dragEnabled: boolean
  /** Alguma linha tem filhos: as demais reservam o espaço da seta para alinhar os checkboxes. */
  reserveToggle: boolean
  /** Um arrasto acabou de terminar: o clique que o segue não deve alternar o item. */
  consumeDragClick: () => boolean
  focusRow: (id: string) => void
  onFocusRow: (id: string) => void
  onNavigate: (id: string, navigation: RowNavigation) => void
  onStartEdit: (id: string) => void
  onStopEdit: (id: string) => void
  onAddChild: (id: string) => void
  onDetails: (id: string) => void
  onHistory: (id: string) => void
  onMoveTo: (id: string) => void
  onSortChildren: (id: string) => void
  /** Remove a linha e leva o foco para a vizinha. */
  onRemove: (id: string) => void
}

const TodoListContext = createContext<TodoListContextValue | null>(null)

export const TodoListProvider = TodoListContext.Provider

export function useTodoList(): TodoListContextValue {
  const value = useContext(TodoListContext)
  if (!value) throw new Error('useTodoList must be used inside <TodoList>')
  return value
}
