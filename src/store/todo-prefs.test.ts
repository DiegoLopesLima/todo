import { TODO_IDB_PREFS_KEY } from '@/constants/todo-storage'
import { createMemoryStorage } from '@/services/todo-storage'
import { createTodoPrefsStore, type PersistedPrefs } from '@/store/todo-prefs'

function setup(initial?: PersistedPrefs) {
  const storage = createMemoryStorage<PersistedPrefs>(
    initial ? { [TODO_IDB_PREFS_KEY]: { state: initial } } : {}
  )
  return { storage, store: createTodoPrefsStore(storage) }
}

describe('todo-prefs store', () => {
  it('começa com os padrões', () => {
    const { store } = setup()
    expect(store.getState()).toMatchObject({
      collapsed: {},
      confetti: true,
      celebratedDay: null,
      hasSeenHelp: false,
      hydrated: false,
    })
  })

  it('recolhe e expande um item', () => {
    const { store } = setup()
    store.getState().toggleCollapsed('a')
    expect(store.getState().collapsed).toEqual({ a: true })
    store.getState().toggleCollapsed('a')
    expect(store.getState().collapsed).toEqual({})
  })

  it('liga e desliga o confete, marca o dia celebrado e a ajuda vista', () => {
    const { store } = setup()
    store.getState().setConfetti(false)
    store.getState().markDayCelebrated('2026-03-10')
    store.getState().markHelpSeen()
    expect(store.getState()).toMatchObject({
      confetti: false,
      celebratedDay: '2026-03-10',
      hasSeenHelp: true,
    })
  })

  it('persiste só as preferências, não os flags de execução', () => {
    const { store, storage } = setup()
    store.getState().setConfetti(false)
    expect(Object.keys(storage.entries.get(TODO_IDB_PREFS_KEY)?.state ?? {}).sort()).toEqual([
      'celebratedDay',
      'collapsed',
      'confetti',
      'hasSeenHelp',
    ])
  })

  it('hidrata o que estava salvo', async () => {
    const { store } = setup({
      collapsed: { x: true },
      confetti: false,
      celebratedDay: '2026-03-09',
      hasSeenHelp: true,
    })
    await store.persist.rehydrate()
    expect(store.getState()).toMatchObject({
      collapsed: { x: true },
      confetti: false,
      celebratedDay: '2026-03-09',
      hasSeenHelp: true,
    })
  })
})
