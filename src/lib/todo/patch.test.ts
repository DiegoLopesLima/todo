import { applyPatch, diffDocs, invertPatch, isEmptyPatch } from '@/lib/todo/patch'
import { dailySeries, docWith, item, uuid } from '@/test/todo-fixtures'

const a = item({ id: uuid(1), text: 'a' })
const b = item({ id: uuid(2), text: 'b' })
const a2 = { ...a, text: 'a2' }

describe('patch', () => {
  it('diffDocs registra criado, alterado e removido', () => {
    const prev = docWith({ items: [a, b] })
    const next = docWith({ items: [a2, item({ id: uuid(3) })] })
    const patch = diffDocs(prev, next)
    expect(Object.keys(patch.items).sort()).toEqual([uuid(1), uuid(2), uuid(3)])
    expect(patch.items[uuid(1)]).toEqual([a, a2])
    expect(patch.items[uuid(2)]).toEqual([b, undefined])
    expect(patch.items[uuid(3)]?.[0]).toBeUndefined()
  })

  it('aplicar o inverso devolve o documento anterior', () => {
    const prev = { ...docWith({ items: [a, b], series: [dailySeries({ id: uuid(500) })] }) }
    const next = {
      ...docWith({ items: [a2], series: [] }),
      clearedDays: { '2026-03-10': true as const },
    }
    const patch = diffDocs(prev, next)
    const forward = applyPatch(prev, patch)
    expect(forward.items).toEqual(next.items)
    expect(forward.series).toEqual({})
    expect(forward.clearedDays).toEqual(next.clearedDays)
    const back = applyPatch(forward, invertPatch(patch))
    expect(back.items).toEqual(prev.items)
    expect(back.series).toEqual(prev.series)
    expect(back.clearedDays).toEqual({})
  })

  it('preserva a referência do que o patch não toca', () => {
    const prev = docWith({ items: [a, b] })
    const patch = diffDocs(prev, docWith({ items: [a2, b] }))
    const applied = applyPatch(prev, patch)
    expect(applied.items[uuid(2)]).toBe(b)
    expect(applied.series).toBe(prev.series)
    expect(applied.clearedDays).toBe(prev.clearedDays)
  })

  it('isEmptyPatch', () => {
    const doc = docWith({ items: [a] })
    expect(isEmptyPatch(diffDocs(doc, doc))).toBe(true)
    expect(isEmptyPatch(diffDocs(doc, docWith({ items: [] })))).toBe(false)
  })

  it('não considera os cursores de geração', () => {
    const prev = docWith({ items: [a] })
    const next = { ...prev, cursors: { [uuid(500)]: '2026-03-10' } }
    expect(isEmptyPatch(diffDocs(prev, next))).toBe(true)
  })
})
