import { checkState, progressOf, reconcileFrom, setDone } from '@/lib/todo/completion'
import { childIds, type Items } from '@/lib/todo/tree'
import { doneItem, item, itemsFrom, testCtx, uuid } from '@/test/todo-fixtures'

const [parent, k1, k2, k3, solo] = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)]

function family(overrides: Partial<Record<string, boolean>> = {}): Items {
  const make = (id: string, rank: string, parentId: string | null) =>
    overrides[id] ? doneItem({ id, rank, parentId }) : item({ id, rank, parentId })
  return itemsFrom(
    make(parent, 'a0', null),
    make(k1, 'a0', parent),
    make(k2, 'a1', parent),
    make(k3, 'a2', parent),
    make(solo, 'a1', null)
  )
}

/** O invariante central: pai com filhos está concluído ⇔ todos os filhos estão. */
function expectInvariant(items: Items): void {
  for (const entry of Object.values(items)) {
    const kids = childIds(items, entry.id)
    if (kids.length > 0) expect(entry.done).toBe(kids.every((id) => items[id].done))
  }
}

describe('completion', () => {
  const ctx = testCtx('2026-03-10')

  describe('setDone', () => {
    it('marca uma folha e carimba a conclusão', () => {
      const result = setDone(family(), solo, true, ctx)
      expect(result.items[solo]).toMatchObject({
        done: true,
        completedOn: '2026-03-10',
        completedAt: ctx.now.toISOString(),
      })
      expect(result.changedIds).toEqual([solo])
      expect(result.completedParents).toEqual([])
    })

    it('marcar um pai marca todos os filhos', () => {
      const result = setDone(family(), parent, true, ctx)
      expect([parent, k1, k2, k3].every((id) => result.items[id].done)).toBe(true)
      expect(result.completedParents).toEqual([parent])
      expectInvariant(result.items)
    })

    it('desmarcar um pai desmarca todos os filhos', () => {
      const all = family({ [parent]: true, [k1]: true, [k2]: true, [k3]: true })
      const result = setDone(all, parent, false, ctx)
      expect([parent, k1, k2, k3].every((id) => !result.items[id].done)).toBe(true)
      expect(result.items[k1].completedOn).toBeNull()
      expectInvariant(result.items)
    })

    it('marcar o último filho aberto conclui o pai', () => {
      const items = family({ [k1]: true, [k2]: true })
      const result = setDone(items, k3, true, ctx)
      expect(result.items[parent].done).toBe(true)
      expect(result.completedParents).toEqual([parent])
      expectInvariant(result.items)
    })

    it('desmarcar um filho reabre o pai', () => {
      const all = family({ [parent]: true, [k1]: true, [k2]: true, [k3]: true })
      const result = setDone(all, k2, false, ctx)
      expect(result.items[parent].done).toBe(false)
      expect(result.items[k1].done).toBe(true)
      expectInvariant(result.items)
    })

    it('marcar um filho com irmãos abertos não conclui o pai', () => {
      const result = setDone(family(), k1, true, ctx)
      expect(result.items[parent].done).toBe(false)
      expect(result.completedParents).toEqual([])
    })

    it('propaga por vários níveis', () => {
      const [root, mid, leaf, other] = [uuid(20), uuid(21), uuid(22), uuid(23)]
      const items = itemsFrom(
        item({ id: root }),
        item({ id: mid, parentId: root }),
        item({ id: leaf, parentId: mid }),
        doneItem({ id: other, parentId: root, rank: 'a1' })
      )
      const result = setDone(items, leaf, true, ctx)
      expect(result.items[mid].done).toBe(true)
      expect(result.items[root].done).toBe(true)
      expect(result.completedParents.sort()).toEqual([mid, root].sort())
    })

    it('é idempotente e preserva a referência quando nada muda', () => {
      const items = family()
      expect(setDone(items, solo, false, ctx).items).toBe(items)
      const once = setDone(items, parent, true, ctx)
      expect(setDone(once.items, parent, true, ctx).items).toBe(once.items)
    })

    it('preserva a identidade dos itens não tocados', () => {
      const items = family()
      const result = setDone(items, k1, true, ctx)
      expect(result.items[solo]).toBe(items[solo])
      expect(result.items[k2]).toBe(items[k2])
    })

    it('ignora id inexistente', () => {
      const items = family()
      expect(setDone(items, uuid(99), true, ctx).items).toBe(items)
    })

    it('mantém o invariante em sequências arbitrárias', () => {
      let items = family()
      const ids = [parent, k1, k2, k3, solo]
      let seed = 7
      const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648
        return seed
      }
      for (let step = 0; step < 200; step++) {
        const id = ids[random() % ids.length]
        items = setDone(items, id, random() % 2 === 0, ctx).items
        expectInvariant(items)
      }
    })
  })

  describe('reconcileFrom', () => {
    it('reabre um pai concluído que ganhou um filho aberto', () => {
      const items = itemsFrom(
        doneItem({ id: parent }),
        doneItem({ id: k1, parentId: parent }),
        item({ id: k2, parentId: parent, rank: 'a1' })
      )
      const result = reconcileFrom(items, [k2], ctx)
      expect(result.items[parent].done).toBe(false)
      expect(result.changedIds).toEqual([parent])
    })

    it('conclui o pai quando só restam filhos concluídos', () => {
      const items = itemsFrom(item({ id: parent }), doneItem({ id: k1, parentId: parent }))
      expect(reconcileFrom(items, [k1], ctx).items[parent].done).toBe(true)
    })

    it('um pai sem filhos mantém o próprio estado', () => {
      const items = itemsFrom(doneItem({ id: parent }))
      expect(reconcileFrom(items, [parent], ctx).items).toBe(items)
    })
  })

  describe('progressOf e checkState', () => {
    it('conta folhas por item', () => {
      const progress = progressOf(family({ [k1]: true }))
      expect(progress.get(parent)).toEqual({ done: 1, total: 3 })
      expect(progress.get(k1)).toEqual({ done: 1, total: 1 })
      expect(progress.get(solo)).toEqual({ done: 0, total: 1 })
    })

    it('é memoizado por referência', () => {
      const items = family()
      expect(progressOf(items)).toBe(progressOf(items))
    })

    it('checkState: marcado, desmarcado e indeterminado', () => {
      expect(checkState({ done: 3, total: 3 })).toBe('checked')
      expect(checkState({ done: 0, total: 3 })).toBe('unchecked')
      expect(checkState({ done: 1, total: 3 })).toBe('indeterminate')
    })
  })
})
