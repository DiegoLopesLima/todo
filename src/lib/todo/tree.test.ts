import { TODO_MAX_DEPTH } from '@/constants/todo'
import {
  ancestorsOf,
  canMove,
  childIds,
  childrenIndex,
  depthOf,
  descendantsOf,
  hasChildren,
  siblingsOf,
  subtreeHeight,
  wouldCreateCycle,
} from '@/lib/todo/tree'
import { item, itemsFrom, uuid } from '@/test/todo-fixtures'

const [a, b, c, d, e] = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)]

// a ─┬─ b ── d
//    └─ c
// e
const items = itemsFrom(
  item({ id: a, rank: 'a0' }),
  item({ id: b, parentId: a, rank: 'a0' }),
  item({ id: c, parentId: a, rank: 'a1' }),
  item({ id: d, parentId: b, rank: 'a0' }),
  item({ id: e, rank: 'a1' })
)

describe('tree', () => {
  it('childrenIndex ordena os filhos e é memoizado por referência', () => {
    const index = childrenIndex(items)
    expect(index.get(null)).toEqual([a, e])
    expect(index.get(a)).toEqual([b, c])
    expect(childrenIndex(items)).toBe(index)
    expect(childrenIndex({ ...items })).not.toBe(index)
  })

  it('childIds, siblingsOf e hasChildren', () => {
    expect(childIds(items, a)).toEqual([b, c])
    expect(childIds(items, c)).toEqual([])
    expect(siblingsOf(items, a).map((x) => x.id)).toEqual([b, c])
    expect(hasChildren(items, a)).toBe(true)
    expect(hasChildren(items, e)).toBe(false)
  })

  it('ancestorsOf vai do pai mais próximo à raiz', () => {
    expect(ancestorsOf(items, d)).toEqual([b, a])
    expect(ancestorsOf(items, a)).toEqual([])
    expect(ancestorsOf(items, uuid(99))).toEqual([])
  })

  it('descendantsOf devolve em pré-ordem', () => {
    expect(descendantsOf(items, a)).toEqual([b, d, c])
    expect(descendantsOf(items, e)).toEqual([])
  })

  it('depthOf e subtreeHeight', () => {
    expect(depthOf(items, a)).toBe(0)
    expect(depthOf(items, d)).toBe(2)
    expect(subtreeHeight(items, a)).toBe(2)
    expect(subtreeHeight(items, c)).toBe(0)
  })

  it('tolera ciclo em dado corrompido', () => {
    const cyclic = itemsFrom(item({ id: a, parentId: b }), item({ id: b, parentId: a }))
    expect(ancestorsOf(cyclic, a)).toEqual([b])
    expect(subtreeHeight(cyclic, a)).toBeGreaterThanOrEqual(0)
  })

  describe('wouldCreateCycle', () => {
    it('detecta mover para si mesmo ou para um descendente', () => {
      expect(wouldCreateCycle(items, a, a)).toBe(true)
      expect(wouldCreateCycle(items, a, d)).toBe(true)
      expect(wouldCreateCycle(items, b, a)).toBe(false)
      expect(wouldCreateCycle(items, a, null)).toBe(false)
    })
  })

  describe('canMove', () => {
    it('aceita um movimento válido', () => {
      expect(canMove(items, e, a)).toEqual({ ok: true })
      expect(canMove(items, d, null)).toEqual({ ok: true })
    })

    it.each([
      ['inexistente', uuid(99), a, 'not-found'],
      ['pai inexistente', e, uuid(99), 'not-found'],
      ['si mesmo', a, a, 'self'],
      ['descendente', a, d, 'cycle'],
    ] as const)('recusa %s', (_label, id, parent, reason) => {
      expect(canMove(items, id, parent)).toEqual({ ok: false, reason })
    })

    it('recusa passar do limite de níveis, contando a subárvore que vai junto', () => {
      const chain = Array.from({ length: TODO_MAX_DEPTH }, (_, i) =>
        item({ id: uuid(100 + i), parentId: i === 0 ? null : uuid(99 + i) })
      )
      const deep = itemsFrom(...chain, item({ id: e }), item({ id: d, parentId: e }))
      const lastLevel = uuid(100 + TODO_MAX_DEPTH - 1)
      // e (com um filho) sob o último nível ficaria no nível 7.
      expect(canMove(deep, e, lastLevel)).toEqual({ ok: false, reason: 'depth' })
      // d (folha) sob o penúltimo nível cabe exatamente no último.
      expect(canMove(deep, d, uuid(100 + TODO_MAX_DEPTH - 2))).toEqual({ ok: true })
      expect(canMove(deep, d, lastLevel)).toEqual({ ok: false, reason: 'depth' })
    })
  })
})
