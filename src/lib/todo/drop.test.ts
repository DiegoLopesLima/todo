import { TODO_INDENT_PX, TODO_MAX_DEPTH } from '@/constants/todo'
import { type DropInput, resolveDrop } from '@/lib/todo/drop'
import { doneItem, item, itemsFrom, uuid } from '@/test/todo-fixtures'

const [A, B, B1, B2, C, D] = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5), uuid(6)]

// A p1
// B p2 ┬ B1 p2
//      └ B2 p2
// C p4
// D p4
const items = itemsFrom(
  item({ id: A, priority: 'p1', rank: 'a0' }),
  item({ id: B, priority: 'p2', rank: 'a0' }),
  item({ id: B1, parentId: B, priority: 'p2', rank: 'a0' }),
  item({ id: B2, parentId: B, priority: 'p2', rank: 'a1' }),
  item({ id: C, priority: 'p4', rank: 'a0' }),
  item({ id: D, priority: 'p4', rank: 'a1' })
)

const rows = [
  { id: A, depth: 0 },
  { id: B, depth: 0 },
  { id: B1, depth: 1 },
  { id: B2, depth: 1 },
  { id: C, depth: 0 },
  { id: D, depth: 0 },
]

function drop(overrides: Partial<DropInput>) {
  return resolveDrop({
    items,
    rows,
    activeId: D,
    overId: D,
    deltaX: 0,
    indentPx: TODO_INDENT_PX,
    nearer: 'below',
    ...overrides,
  })
}

describe('resolveDrop', () => {
  it('soltar entre faixas adota a prioridade do vizinho mais perto do ponteiro', () => {
    const nearAbove = drop({ overId: B, nearer: 'above' })
    expect(nearAbove).toMatchObject({
      ok: true,
      target: { parentId: null, priority: 'p1', depth: 0 },
    })
    if (nearAbove.ok) expect(nearAbove.target.rank > items[A].rank).toBe(true)

    const nearBelow = drop({ overId: B, nearer: 'below' })
    expect(nearBelow).toMatchObject({ ok: true, target: { parentId: null, priority: 'p2' } })
    if (nearBelow.ok) expect(nearBelow.target.rank < items[B].rank).toBe(true)
  })

  it('soltar entre dois irmãos da mesma faixa fica entre eles e adota a faixa', () => {
    const result = drop({ activeId: C, overId: B2, deltaX: TODO_INDENT_PX })
    expect(result).toMatchObject({ ok: true, target: { parentId: B, priority: 'p2', depth: 1 } })
    if (result.ok) {
      expect(result.target.rank > items[B1].rank && result.target.rank < items[B2].rank).toBe(true)
    }
  })

  it('o deslocamento horizontal aninha, limitado pelo item de cima', () => {
    const result = drop({ overId: C, deltaX: TODO_INDENT_PX * 10 })
    expect(result).toMatchObject({
      ok: true,
      target: { parentId: B2, priority: 'p4', depth: 2 },
    })
  })

  it('arrastar para a esquerda sobe um nível', () => {
    const result = drop({ activeId: B2, overId: B2, deltaX: -TODO_INDENT_PX, nearer: 'above' })
    expect(result).toMatchObject({ ok: true, target: { parentId: null, priority: 'p2', depth: 0 } })
    if (result.ok) expect(result.target.rank > items[B].rank).toBe(true)
  })

  it('não deixa o item acima ficar órfão: o nível mínimo é o do item de baixo', () => {
    const result = drop({ activeId: C, overId: B2, deltaX: -TODO_INDENT_PX * 5 })
    expect(result).toMatchObject({ ok: true, target: { depth: 1, parentId: B } })
  })

  it('quem já divide a prioridade com um vizinho continua na própria faixa', () => {
    // B2 (p2) solto entre B1 (p2) e C (p4), com o ponteiro mais perto de C: segue p2.
    const result = drop({ activeId: B2, overId: B1, nearer: 'below', deltaX: 0 })
    expect(result).toMatchObject({ ok: true, target: { priority: 'p2' } })
    const down = drop({ activeId: B1, overId: B2, nearer: 'above', deltaX: -TODO_INDENT_PX })
    expect(down).toMatchObject({ ok: true, target: { parentId: null, priority: 'p2' } })
  })

  it('soltar depois de um concluído é soltar no fim dos abertos', () => {
    const o1 = item({ id: uuid(10), rank: 'a0' })
    const o2 = item({ id: uuid(11), rank: 'a1' })
    const done = doneItem({ id: uuid(12), rank: 'a2' })
    const list = itemsFrom(o1, o2, done)
    const result = resolveDrop({
      items: list,
      rows: [o1, o2, done].map((x) => ({ id: x.id, depth: 0 })),
      activeId: o1.id,
      overId: done.id,
      deltaX: 0,
      indentPx: TODO_INDENT_PX,
      nearer: 'above',
    })
    expect(result).toMatchObject({ ok: true, target: { parentId: null, priority: 'p4' } })
    if (result.ok) expect(result.target.rank > o2.rank).toBe(true)
  })

  it('em um pai vazio mantém a prioridade do item', () => {
    const lone = item({ id: uuid(20), priority: 'p3' })
    const target = item({ id: uuid(21), rank: 'a1' })
    const list = itemsFrom(lone, target)
    const result = resolveDrop({
      items: list,
      rows: [lone, target].map((x) => ({ id: x.id, depth: 0 })),
      activeId: lone.id,
      overId: target.id,
      deltaX: TODO_INDENT_PX,
      indentPx: TODO_INDENT_PX,
      nearer: 'below',
    })
    expect(result).toMatchObject({ ok: true, target: { parentId: target.id, priority: 'p3' } })
  })

  it('recusa passar do limite de níveis', () => {
    const chain = Array.from({ length: TODO_MAX_DEPTH }, (_, i) =>
      item({ id: uuid(100 + i), parentId: i === 0 ? null : uuid(99 + i) })
    )
    const parent = item({ id: uuid(200), rank: 'a1' })
    const child = item({ id: uuid(201), parentId: parent.id })
    const list = itemsFrom(...chain, parent, child)
    const result = resolveDrop({
      items: list,
      rows: [...chain.map((x, i) => ({ id: x.id, depth: i })), { id: parent.id, depth: 0 }],
      activeId: parent.id,
      overId: chain[chain.length - 1].id,
      deltaX: TODO_INDENT_PX * 20,
      indentPx: TODO_INDENT_PX,
      nearer: 'below',
    })
    expect(result).toEqual({ ok: false, reason: 'depth' })
  })

  it('linhas desconhecidas não são movidas', () => {
    expect(drop({ overId: uuid(999) })).toEqual({ ok: false, reason: 'not-found' })
    expect(drop({ activeId: uuid(999) })).toEqual({ ok: false, reason: 'not-found' })
  })
})
