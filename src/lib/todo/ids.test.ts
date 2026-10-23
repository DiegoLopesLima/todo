import { isValidItemId, newId, occurrenceChildId, occurrenceId } from '@/lib/todo/ids'
import { uuid } from '@/test/todo-fixtures'

describe('ids', () => {
  it('newId gera UUIDs válidos e distintos', () => {
    const a = newId()
    const b = newId()
    expect(isValidItemId(a)).toBe(true)
    expect(a).not.toBe(b)
  })

  it('newId cai para getRandomValues quando randomUUID não existe (http fora de localhost)', () => {
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const id = newId()
      expect(isValidItemId(id)).toBe(true)
      expect(id[14]).toBe('4')
      expect('89ab').toContain(id[19])
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })

  it('compõe ids determinísticos de ocorrência e de filhos', () => {
    const series = uuid(1)
    expect(occurrenceId(series, '2026-03-10')).toBe(`${series}:2026-03-10`)
    expect(occurrenceChildId(occurrenceId(series, '2026-03-10'), 2)).toBe(`${series}:2026-03-10:2`)
    expect(isValidItemId(occurrenceChildId(occurrenceId(series, '2026-03-10'), 2))).toBe(true)
  })

  it.each(['__proto__', 'constructor', 'abc', '', `${uuid(1)}:2026-13-45x`])(
    'rejeita o id %j',
    (id) => {
      expect(isValidItemId(id)).toBe(false)
    }
  )
})
