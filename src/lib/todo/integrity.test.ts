import { TODO_MAX_DEPTH } from '@/constants/todo'
import { repairDocument } from '@/lib/todo/integrity'
import { ancestorsOf } from '@/lib/todo/tree'
import { dailySeries, docWith, doneItem, item, testCtx, uuid } from '@/test/todo-fixtures'

const ctx = testCtx()

describe('repairDocument', () => {
  it('um documento íntegro volta o mesmo objeto', () => {
    const doc = docWith({
      items: [item({ id: uuid(1) }), item({ id: uuid(2), parentId: uuid(1) })],
    })
    const result = repairDocument(doc, ctx)
    expect(result.doc).toBe(doc)
    expect(result.fixes).toBe(0)
  })

  it('pai inexistente vai para a raiz, sem perder o item', () => {
    const doc = docWith({ items: [item({ id: uuid(1), parentId: uuid(999) })] })
    const { doc: fixed, fixes } = repairDocument(doc, ctx)
    expect(fixed.items[uuid(1)].parentId).toBeNull()
    expect(fixes).toBe(1)
  })

  it('quebra um ciclo e mantém todos os itens', () => {
    const doc = docWith({
      items: [item({ id: uuid(1), parentId: uuid(2) }), item({ id: uuid(2), parentId: uuid(1) })],
    })
    const { doc: fixed } = repairDocument(doc, ctx)
    expect(Object.keys(fixed.items)).toHaveLength(2)
    for (const id of Object.keys(fixed.items)) {
      expect(ancestorsOf(fixed.items, id).length).toBeLessThan(2)
    }
    const roots = Object.values(fixed.items).filter((x) => x.parentId === null)
    expect(roots).toHaveLength(1)
  })

  it('desanexa o que passa do limite de níveis', () => {
    const chain = Array.from({ length: TODO_MAX_DEPTH + 2 }, (_, i) =>
      item({ id: uuid(100 + i), parentId: i === 0 ? null : uuid(99 + i) })
    )
    const { doc: fixed } = repairDocument(docWith({ items: chain }), ctx)
    expect(Object.keys(fixed.items)).toHaveLength(chain.length)
    for (const id of Object.keys(fixed.items)) {
      expect(ancestorsOf(fixed.items, id).length).toBeLessThanOrEqual(TODO_MAX_DEPTH - 1)
    }
  })

  it('item ligado a uma série que não existe vira item comum', () => {
    const doc = docWith({
      items: [item({ id: uuid(1), seriesId: uuid(500), occurrenceOn: '2026-03-10' })],
    })
    const { doc: fixed } = repairDocument(doc, ctx)
    expect(fixed.items[uuid(1)]).toMatchObject({ seriesId: null, occurrenceOn: null })
  })

  it('série com pai inexistente e cursor órfão são corrigidos', () => {
    const doc = docWith({
      series: [dailySeries({ id: uuid(500), parentId: uuid(999) })],
      cursors: { [uuid(500)]: '2026-03-10', [uuid(501)]: '2026-03-10' },
    })
    const { doc: fixed } = repairDocument(doc, ctx)
    expect(fixed.series[uuid(500)].parentId).toBeNull()
    expect(fixed.cursors).toEqual({ [uuid(500)]: '2026-03-10' })
  })

  it('restaura o invariante pai↔filhos', () => {
    const doc = docWith({
      items: [
        doneItem({ id: uuid(1) }),
        item({ id: uuid(2), parentId: uuid(1) }),
        item({ id: uuid(3) }),
        doneItem({ id: uuid(4), parentId: uuid(3) }),
      ],
    })
    const { doc: fixed } = repairDocument(doc, ctx)
    expect(fixed.items[uuid(1)].done).toBe(false)
    expect(fixed.items[uuid(3)].done).toBe(true)
  })
})
