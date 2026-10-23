'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'

import { TODO_VIEWS, type TodoView } from '@/enums/todo'

const parsers = {
  v: parseAsStringLiteral(TODO_VIEWS).withDefault('today'),
  q: parseAsString.withDefault(''),
}

/**
 * Visão (`?v=today|upcoming|all`) e busca (`?q=`) da lista, guardadas na URL: o botão voltar, um
 * link direto e recarregar a página restauram o que a pessoa estava vendo.
 *
 * Exige um boundary Suspense acima (lê `useSearchParams`).
 */
export function useTodoView() {
  const [{ v, q }, setParams] = useQueryStates(parsers, { history: 'replace' })
  return {
    view: v,
    query: q,
    setView: (view: TodoView) => setParams({ v: view }),
    setQuery: (query: string) => setParams({ q: query === '' ? null : query }),
  }
}
