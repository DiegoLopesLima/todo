import { TODO_MAX_DEPTH } from '@/constants/todo'
import { runCommand } from '@/lib/todo/commands'
import { planIndent, planMoveTo, planOutdent, planSiblingMove } from '@/lib/todo/move-plans'
import { childIds } from '@/lib/todo/tree'
import { docWith, doneItem, item, testCtx, uuid } from '@/test/todo-fixtures'

const ctx = testCtx()
const [A, B, C, D, K] = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)]

/** Aplica o plano como `moveItem` e devolve a ordem resultante dos irmãos. */
function applyPlan(
  doc: ReturnType<typeof docWith>,
  id: string,
  plan: NonNullable<ReturnType<typeof planSiblingMove>>
) {
  const result = runCommand(doc, { type: 'moveItem', id, ...plan }, ctx)
  if (!result.ok) throw new Error(result.reason)
  return result.doc
}

describe('planSiblingMove', () => {
  const doc = docWith({
    items: [
      item({ id: A, rank: 'a0', priority: 'p2' }),
      item({ id: B, rank: 'a1', priority: 'p2' }),
      item({ id: C, rank: 'a0', priority: 'p4' }),
      item({ id: D, rank: 'a1', priority: 'p4' }),
      doneItem({ id: K, rank: 'a2', priority: 'p4' }),
    ],
  })

  it('sobe uma posição dentro da faixa', () => {
    const plan = planSiblingMove(doc.items, B, 'up')
    if (!plan) throw new Error('esperava plano')
    expect(plan.priority).toBe('p2')
    expect(childIds(applyPlan(doc, B, plan).items, null).slice(0, 2)).toEqual([B, A])
  })

  it('desce uma posição dentro da faixa', () => {
    const plan = planSiblingMove(doc.items, C, 'down')
    if (!plan) throw new Error('esperava plano')
    expect(childIds(applyPlan(doc, C, plan).items, null).slice(2, 4)).toEqual([D, C])
  })

  it('cruzar a fronteira de uma faixa adota a prioridade do vizinho', () => {
    const up = planSiblingMove(doc.items, C, 'up')
    expect(up?.priority).toBe('p2')
    const movedUp = applyPlan(doc, C, up as NonNullable<typeof up>)
    expect(movedUp.items[C].priority).toBe('p2')
    expect(childIds(movedUp.items, null).slice(0, 3)).toEqual([A, C, B])

    const down = planSiblingMove(doc.items, B, 'down')
    expect(down?.priority).toBe('p4')
    const movedDown = applyPlan(doc, B, down as NonNullable<typeof down>)
    expect(movedDown.items[B].priority).toBe('p4')
    expect(childIds(movedDown.items, null)[2]).toBe(B)
  })

  it('devolve null nos limites, para concluídos e para inexistentes', () => {
    expect(planSiblingMove(doc.items, A, 'up')).toBeNull()
    expect(planSiblingMove(doc.items, D, 'down')).toBeNull() // o seguinte está concluído
    expect(planSiblingMove(doc.items, K, 'up')).toBeNull()
    expect(planSiblingMove(doc.items, uuid(99), 'up')).toBeNull()
  })
})

describe('planIndent / planOutdent / planMoveTo', () => {
  const doc = docWith({
    items: [
      item({ id: A, rank: 'a0', priority: 'p2' }),
      item({ id: B, rank: 'a1', priority: 'p2' }),
      item({ id: C, parentId: B, rank: 'a0' }),
    ],
  })

  it('indentar faz do item o último filho do irmão de cima, mantendo a prioridade', () => {
    const plan = planIndent(doc.items, B)
    expect(plan).toMatchObject({ parentId: A, priority: 'p2' })
    const moved = applyPlan(doc, B, plan as NonNullable<typeof plan>)
    expect(moved.items[B].parentId).toBe(A)
    expect(moved.items[C].parentId).toBe(B)
  })

  it('indentar o primeiro irmão não é possível', () => {
    expect(planIndent(doc.items, A)).toBeNull()
  })

  it('desindentar sobe para o pai do pai', () => {
    const plan = planOutdent(doc.items, C)
    expect(plan?.parentId).toBeNull()
    expect(applyPlan(doc, C, plan as NonNullable<typeof plan>).items[C].parentId).toBeNull()
  })

  it('desindentar um item da raiz não é possível', () => {
    expect(planOutdent(doc.items, A)).toBeNull()
  })

  it('mover para outro pai, e para o mesmo pai não faz nada', () => {
    expect(planMoveTo(doc.items, C, A)).toMatchObject({ parentId: A })
    expect(planMoveTo(doc.items, C, B)).toBeNull()
    expect(planMoveTo(doc.items, C, null)).toMatchObject({ parentId: null })
  })

  it('recusa o que viraria ciclo ou passaria do limite de níveis', () => {
    expect(planMoveTo(doc.items, B, C)).toBeNull()
    const chain = Array.from({ length: TODO_MAX_DEPTH }, (_, i) =>
      item({ id: uuid(100 + i), parentId: i === 0 ? null : uuid(99 + i), rank: 'a0' })
    )
    const deep = docWith({ items: [...chain, item({ id: D, rank: 'a1' })] })
    expect(planMoveTo(deep.items, D, uuid(100 + TODO_MAX_DEPTH - 1))).toBeNull()
  })

  it('desindentar tira do último nível e indentar de volta cabe', () => {
    const plan = planOutdent(doc.items, C)
    const out = applyPlan(doc, C, plan as NonNullable<typeof plan>)
    expect(planIndent(out.items, C)).not.toBeNull()
  })
})
