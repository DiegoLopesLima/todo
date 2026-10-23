import { act, render, waitFor } from '@testing-library/react'

import { TODO_IDB_DOC_KEY, TODO_IDB_PREFS_KEY } from '@/constants/todo-storage'
import { toDateKey } from '@/lib/todo/dates'
import { EMPTY_STACKS } from '@/lib/todo/undo'
import { TodoProvider } from '@/providers/TodoProvider'
import { requestPersistentStorage } from '@/services/storage-persistence'
import { emptyTodoDocument, todoDocumentStorage, useTodoDocument } from '@/store/todo-document'
import { todoPrefsStorage, useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'
import { FakeBroadcastChannel, installFakeBroadcastChannel } from '@/test/broadcast-channel'
import { dailySeries, docWith, uuid } from '@/test/todo-fixtures'

jest.mock('@/services/storage-persistence', () => ({
  requestPersistentStorage: jest.fn(async () => true),
}))

const initialUi = useTodoUi.getState()
let restoreChannel: () => void

beforeAll(() => {
  // Uma vez só: o canal do app é aberto sob demanda e fica em cache pelo resto do arquivo.
  restoreChannel = installFakeBroadcastChannel()
})
afterAll(() => restoreChannel())

beforeEach(async () => {
  await todoDocumentStorage.removeItem(TODO_IDB_DOC_KEY)
  await todoPrefsStorage.removeItem(TODO_IDB_PREFS_KEY)
  useTodoDocument.setState({ doc: emptyTodoDocument(), stacks: EMPTY_STACKS, hydrated: false })
  useTodoPrefs.setState({ hydrated: false })
  useTodoUi.setState(initialUi, true)
  jest.mocked(requestPersistentStorage).mockClear()
})

describe('TodoProvider', () => {
  it('hidrata as stores, e sem IndexedDB avisa que os dados não serão salvos', async () => {
    render(<TodoProvider>conteúdo</TodoProvider>)
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    expect(useTodoPrefs.getState().hydrated).toBe(true)
    expect(useTodoUi.getState().persistError).toBe('unavailable')
  })

  it('renderiza os filhos', () => {
    const { getByText } = render(<TodoProvider>olá</TodoProvider>)
    expect(getByText('olá')).toBeInTheDocument()
  })

  it('gera as ocorrências devidas ao abrir', async () => {
    const today = toDateKey(new Date())
    useTodoDocument.setState({
      doc: docWith({ series: [dailySeries({ id: uuid(500), startsOn: today })] }),
    })
    render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(Object.keys(useTodoDocument.getState().doc.items)).toHaveLength(1))
  })

  it('publica o dia no estado de UI', async () => {
    render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(useTodoUi.getState().today).toBe(toDateKey(new Date())))
  })

  it('grava o que estiver pendente quando a página é escondida ou fechada', async () => {
    const flush = jest.spyOn(todoDocumentStorage, 'flush')
    render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(flush).toHaveBeenCalled()

    flush.mockClear()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(flush).toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('recarrega e avisa quando outra aba grava uma revisão mais nova', async () => {
    render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))

    act(() => {
      new FakeBroadcastChannel('todo-sync').postMessage({ rev: 999 })
    })
    expect(useTodoUi.getState().syncedFromOtherTab).toBe(true)
  })

  it('ignora o aviso de uma revisão que esta aba já tem', async () => {
    render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))

    act(() => {
      new FakeBroadcastChannel('todo-sync').postMessage({ rev: 0 })
    })
    expect(useTodoUi.getState().syncedFromOtherTab).toBe(false)
  })

  it('pede armazenamento persistente quando passa a haver itens', async () => {
    render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    expect(requestPersistentStorage).not.toHaveBeenCalled()

    act(() => {
      useTodoDocument.getState().dispatch({ type: 'createItem', text: 'a', parentId: null })
    })
    await waitFor(() => expect(requestPersistentStorage).toHaveBeenCalledTimes(1))
  })

  it('para de ouvir ao desmontar', async () => {
    const { unmount } = render(<TodoProvider>x</TodoProvider>)
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    unmount()
    const flush = jest.spyOn(todoDocumentStorage, 'flush')
    window.dispatchEvent(new Event('pagehide'))
    expect(flush).not.toHaveBeenCalled()
  })
})
