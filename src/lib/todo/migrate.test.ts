import { TODO_PERSIST_VERSION } from '@/constants/todo-storage'
import { migratePersisted } from '@/lib/todo/migrate'

describe('migratePersisted', () => {
  it('na versão atual devolve o estado como está', () => {
    const state = { doc: {} }
    expect(migratePersisted(state, TODO_PERSIST_VERSION)).toBe(state)
  })

  it('uma versão mais nova que a atual devolve o estado como está (quem lê valida)', () => {
    const state = { doc: {} }
    expect(migratePersisted(state, TODO_PERSIST_VERSION + 3)).toBe(state)
  })

  it('uma versão antiga sem passo de migração falha alto, em vez de adivinhar', () => {
    expect(() => migratePersisted({}, 0)).toThrow('Missing todo migration from version 0')
  })
})
