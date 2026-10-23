import { TODO_MAX_DEPTH } from '@/constants/todo'
import { buildParentOptions } from '@/lib/todo/parents'
import { item, itemsFrom, uuid } from '@/test/todo-fixtures'

const [A, B, C, D] = [uuid(1), uuid(2), uuid(3), uuid(4)]

describe('buildParentOptions', () => {
  const items = itemsFrom(
    item({ id: A, text: 'A', rank: 'a0' }),
    item({ id: B, text: 'B', parentId: A, rank: 'a0' }),
    item({ id: C, text: 'C', parentId: B, rank: 'a0' }),
    item({ id: D, text: 'D', rank: 'a1' })
  )

  it('começa por "nenhum" e lista a árvore em ordem, com o nível', () => {
    expect(buildParentOptions(items, { noneLabel: 'Nenhum' })).toEqual([
      { value: null, label: 'Nenhum', depth: -1 },
      { value: A, label: 'A', depth: 0 },
      { value: B, label: 'B', depth: 1 },
      { value: C, label: 'C', depth: 2 },
      { value: D, label: 'D', depth: 0 },
    ])
  })

  it('tira o item e a subárvore dele (viraria ciclo)', () => {
    const values = buildParentOptions(items, { noneLabel: 'x', excludeId: A }).map((o) => o.value)
    expect(values).toEqual([null, D])
  })

  it('não oferece quem deixaria o item (e o que ele leva) acima do limite de níveis', () => {
    const chain = Array.from({ length: TODO_MAX_DEPTH }, (_, i) =>
      item({ id: uuid(100 + i), parentId: i === 0 ? null : uuid(99 + i), text: `n${i}` })
    )
    const withLoose = itemsFrom(...chain, item({ id: D, rank: 'a1' }))
    const options = buildParentOptions(withLoose, { noneLabel: 'x', excludeId: D })
    // Um item solto (altura 0) pode ir até o penúltimo nível (TODO_MAX_DEPTH - 2).
    expect(Math.max(...options.map((o) => o.depth))).toBe(TODO_MAX_DEPTH - 2)

    const carrying = itemsFrom(
      ...chain,
      item({ id: D, rank: 'a1' }),
      item({ id: uuid(300), parentId: D })
    )
    const limited = buildParentOptions(carrying, { noneLabel: 'x', excludeId: D })
    expect(Math.max(...limited.map((o) => o.depth))).toBe(TODO_MAX_DEPTH - 3)
  })

  it('um excludeId inexistente é ignorado', () => {
    expect(buildParentOptions(items, { noneLabel: 'x', excludeId: uuid(99) })).toHaveLength(5)
  })
})
