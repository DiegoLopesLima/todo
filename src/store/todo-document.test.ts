import { TODO_IDB_DOC_KEY, TODO_PERSIST_VERSION } from '@/constants/todo-storage'
import { createMemoryStorage } from '@/services/todo-storage'
import {
  createTodoDocumentStore,
  emptyTodoDocument,
  type PersistedTodo,
} from '@/store/todo-document'
import { dailySeries, docWith, item, testCtx, uuid } from '@/test/todo-fixtures'

function setup(initial?: PersistedTodo, version = TODO_PERSIST_VERSION) {
  const storage = createMemoryStorage<PersistedTodo>(
    initial ? { [TODO_IDB_DOC_KEY]: { state: initial, version } } : {}
  )
  const ctx = testCtx('2026-03-10')
  const store = createTodoDocumentStore({ storage, getCtx: () => ctx })
  return { store, storage }
}

const saved = (storage: ReturnType<typeof setup>['storage']) =>
  storage.entries.get(TODO_IDB_DOC_KEY)?.state.doc

describe('todo-document store', () => {
  it('antes de hidratar, recusa comandos', () => {
    const { store } = setup()
    expect(store.getState().hydrated).toBe(false)
    expect(store.getState().dispatch({ type: 'createItem', text: 'x', parentId: null })).toEqual({
      ok: false,
      reason: 'not-ready',
    })
  })

  it('hidratar sem nada salvo começa vazio e libera os comandos', async () => {
    const { store } = setup()
    await store.persist.rehydrate()
    expect(store.getState().hydrated).toBe(true)
    expect(store.getState().doc).toEqual(emptyTodoDocument())
  })

  it('dispatch muda o documento e persiste só o documento', async () => {
    const { store, storage } = setup()
    await store.persist.rehydrate()
    const result = store
      .getState()
      .dispatch({ type: 'createItem', text: 'Pagar boleto', parentId: null })

    expect(result.ok).toBe(true)
    expect(Object.values(store.getState().doc.items).map((i) => i.text)).toEqual(['Pagar boleto'])
    expect(store.getState().stacks.undo).toHaveLength(1)
    expect(saved(storage)?.rev).toBe(1)
    expect(Object.keys(storage.entries.get(TODO_IDB_DOC_KEY)?.state ?? {})).toEqual(['doc'])
    expect(storage.entries.get(TODO_IDB_DOC_KEY)?.version).toBe(TODO_PERSIST_VERSION)
  })

  it('um comando recusado não muda nada nem empilha desfazer', async () => {
    const { store } = setup()
    await store.persist.rehydrate()
    const before = store.getState().doc
    const result = store.getState().dispatch({ type: 'createItem', text: '  ', parentId: null })
    expect(result).toEqual({ ok: false, reason: 'empty-text' })
    expect(store.getState().doc).toBe(before)
    expect(store.getState().stacks.undo).toEqual([])
  })

  it('desfazer e refazer passam pela store e devolvem o passo', async () => {
    const { store } = setup()
    await store.persist.rehydrate()
    store.getState().dispatch({ type: 'createItem', text: 'a', parentId: null })

    const undone = store.getState().undo()
    expect(undone?.label).toBe('createItem')
    expect(store.getState().doc.items).toEqual({})
    expect(store.getState().stacks.redo).toHaveLength(1)

    expect(store.getState().redo()?.label).toBe('createItem')
    expect(Object.keys(store.getState().doc.items)).toHaveLength(1)
    expect(store.getState().redo()).toBeNull()
  })

  it('desfazer sem passos devolve null', async () => {
    const { store } = setup()
    await store.persist.rehydrate()
    expect(store.getState().undo()).toBeNull()
  })

  describe('hidratação', () => {
    it('carrega o documento salvo', async () => {
      const doc = docWith({ items: [item({ id: uuid(1), text: 'salvo' })] })
      const { store } = setup({ doc })
      await store.persist.rehydrate()
      expect(store.getState().doc.items[uuid(1)].text).toBe('salvo')
      expect(store.getState().hydrated).toBe(true)
    })

    it('um documento salvo inválido não derruba o app: sobe vazio', async () => {
      const { store } = setup({ doc: { nope: true } } as unknown as PersistedTodo)
      await store.persist.rehydrate()
      expect(store.getState().hydrated).toBe(true)
      expect(store.getState().doc).toEqual(emptyTodoDocument())
    })

    it('repara referências quebradas ao carregar', async () => {
      const doc = docWith({ items: [item({ id: uuid(1), parentId: uuid(404) })] })
      const { store } = setup({ doc })
      await store.persist.rehydrate()
      expect(store.getState().doc.items[uuid(1)].parentId).toBeNull()
    })

    it('recarregar descarta a pilha de desfazer (os passos eram de outro documento)', async () => {
      const { store } = setup()
      await store.persist.rehydrate()
      store.getState().dispatch({ type: 'createItem', text: 'a', parentId: null })
      expect(store.getState().stacks.undo).toHaveLength(1)
      await store.persist.rehydrate()
      expect(store.getState().stacks.undo).toEqual([])
    })
  })

  describe('markExported', () => {
    it('zera o contador de mudanças, registra o instante e persiste', async () => {
      const { store, storage } = setup()
      await store.persist.rehydrate()
      store.getState().dispatch({ type: 'createItem', text: 'a', parentId: null })
      expect(store.getState().doc.meta.changesSinceExport).toBe(1)

      store.getState().markExported()

      expect(store.getState().doc.meta).toEqual({
        lastExportedAt: expect.any(String),
        changesSinceExport: 0,
      })
      expect(saved(storage)?.meta.changesSinceExport).toBe(0)
      // Exportar não é uma alteração da lista: não vira passo de desfazer.
      expect(store.getState().stacks.undo).toHaveLength(1)
    })
  })

  describe('materialize', () => {
    it('gera as ocorrências devidas e não vira passo de desfazer', async () => {
      const doc = docWith({ series: [dailySeries({ id: uuid(500), startsOn: '2026-03-09' })] })
      const { store } = setup({ doc })
      await store.persist.rehydrate()

      const run = store.getState().materialize()
      expect(run.created).toHaveLength(2)
      expect(Object.keys(store.getState().doc.items)).toHaveLength(2)
      expect(store.getState().stacks.undo).toEqual([])
    })

    it('é idempotente e não altera a referência do documento quando nada muda', async () => {
      const doc = docWith({ series: [dailySeries({ id: uuid(500), startsOn: '2026-03-09' })] })
      const { store } = setup({ doc })
      await store.persist.rehydrate()
      store.getState().materialize()
      const settled = store.getState().doc
      expect(store.getState().materialize().changed).toBe(false)
      expect(store.getState().doc).toBe(settled)
    })
  })
})
