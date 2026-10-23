import { useTodoUi } from '@/store/todo-ui'

const initial = useTodoUi.getState()

describe('todo-ui store', () => {
  beforeEach(() => useTodoUi.setState(initial, true))

  it('setToday não troca o estado se o dia é o mesmo', () => {
    useTodoUi.getState().setToday('2026-03-10')
    const before = useTodoUi.getState()
    useTodoUi.getState().setToday('2026-03-10')
    expect(useTodoUi.getState()).toBe(before)
  })

  it('conta os diálogos abertos sem nunca ficar negativo', () => {
    const { openModal, closeModal } = useTodoUi.getState()
    openModal()
    openModal()
    expect(useTodoUi.getState().modalCount).toBe(2)
    closeModal()
    closeModal()
    closeModal()
    expect(useTodoUi.getState().modalCount).toBe(0)
  })

  it('segura e solta itens recém-concluídos', () => {
    useTodoUi.getState().holdOpen(['a', 'b'], 1000)
    expect(useTodoUi.getState().recentlyDone).toEqual({ a: 1000, b: 1000 })
    useTodoUi.getState().releaseHold(['a'])
    expect(useTodoUi.getState().recentlyDone).toEqual({ b: 1000 })
  })

  it('cada celebração tem um id novo, mesmo repetindo o tipo', () => {
    useTodoUi.getState().celebrate('parent', 'x')
    const first = useTodoUi.getState().celebration
    useTodoUi.getState().celebrate('parent', 'x')
    const second = useTodoUi.getState().celebration
    expect(first?.kind).toBe('parent')
    expect(second?.id).toBeGreaterThan(first?.id ?? 0)
  })

  it('cada anúncio para leitor de tela tem um id novo, mesmo repetindo o texto', () => {
    useTodoUi.getState().announce('Concluída')
    const first = useTodoUi.getState().announcement
    useTodoUi.getState().announce('Concluída')
    const second = useTodoUi.getState().announcement
    expect(second?.text).toBe('Concluída')
    expect(second?.id).toBeGreaterThan(first?.id ?? 0)
  })

  it('guarda os avisos de armazenamento, sincronia e dados corrompidos', () => {
    useTodoUi.getState().setPersistError('quota')
    useTodoUi.getState().setSyncedFromOtherTab(true)
    useTodoUi.getState().setCorruptData(true)
    expect(useTodoUi.getState()).toMatchObject({
      persistError: 'quota',
      syncedFromOtherTab: true,
      corruptData: true,
    })
  })
})
