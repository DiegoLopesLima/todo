'use client'

import { useMemo } from 'react'

import type { TodoView } from '@/enums/todo'
import { buildVisibleRows, type Row } from '@/lib/todo/filters'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'

/**
 * As linhas visíveis da lista (já achatadas, na ordem de exibição) para a visão e a busca.
 * Recalcula só quando algo que as afeta muda: os itens, o dia, o recolhimento ou a pausa de um item
 * recém-concluído.
 */
export function useTodoRows(view: TodoView, query: string): Row[] {
  const items = useTodoDocument((state) => state.doc.items)
  const today = useTodoUi((state) => state.today)
  const collapsed = useTodoPrefs((state) => state.collapsed)
  const held = useTodoUi((state) => state.recentlyDone)

  return useMemo(
    () =>
      buildVisibleRows(items, {
        view,
        query,
        today,
        collapsed,
        holdOpen: new Set(Object.keys(held)),
      }),
    [items, view, query, today, collapsed, held]
  )
}
