import { act } from '@testing-library/react'
import { TodoApp } from '@/app/[locale]/TodoApp'
import { TODO_IDB_DOC_KEY, TODO_IDB_PREFS_KEY } from '@/constants/todo-storage'
import type { Command, RunResult } from '@/lib/todo/commands'
import { EMPTY_STACKS } from '@/lib/todo/undo'
import type { TodoDocument } from '@/lib/validations/todo'
import { emptyTodoDocument, todoDocumentStorage, useTodoDocument } from '@/store/todo-document'
import { todoPrefsStorage, useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'
import { renderWithIntl } from '@/test/intl'

const initialUi = useTodoUi.getState()
const initialPrefs = useTodoPrefs.getState()

/**
 * Zera as stores do app de tarefas entre testes: o documento, as preferências, o estado de UI e o
 * armazenamento (que no jsdom, sem IndexedDB, é o fallback em memória — compartilhado entre testes).
 */
export async function resetTodoStores(): Promise<void> {
  await todoDocumentStorage.removeItem(TODO_IDB_DOC_KEY)
  await todoPrefsStorage.removeItem(TODO_IDB_PREFS_KEY)
  useTodoDocument.setState({ doc: emptyTodoDocument(), stacks: EMPTY_STACKS, hydrated: false })
  useTodoPrefs.setState({ ...initialPrefs, hydrated: false }, true)
  useTodoUi.setState(initialUi, true)
}

/** Põe um documento no lugar antes de renderizar (o provider o lê ao hidratar). */
export function seedDocument(doc: TodoDocument): void {
  useTodoDocument.setState({ doc })
}

/** Renderiza o app inteiro com as mensagens reais em pt-BR. */
export function renderTodoApp(options?: {
  searchParams?: string | Record<string, string>
}): ReturnType<typeof renderWithIntl> {
  return renderWithIntl(<TodoApp />, options)
}

/** Executa um comando fora da interface (para montar o estado de um teste). */
export function dispatchNow(command: Command): RunResult {
  let result: RunResult = { ok: false, reason: 'not-ready' }
  act(() => {
    result = useTodoDocument.getState().dispatch(command)
  })
  return result
}
