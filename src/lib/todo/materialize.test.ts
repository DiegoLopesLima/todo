import {
  TODO_MAX_CATCHUP_PER_RUN,
  TODO_MAX_CATCHUP_PER_SERIES,
  TODO_MAX_ITEMS,
} from '@/constants/todo'
import { materializeDue } from '@/lib/todo/materialize'
import { childIds } from '@/lib/todo/tree'
import { dailySeries, docWith, doneItem, item, testCtx, uuid } from '@/test/todo-fixtures'

const ctx = testCtx('2026-03-10')
const seriesId = uuid(500)

describe('materializeDue', () => {
  it('sem séries não muda nada', () => {
    const doc = docWith({ items: [item({ id: uuid(1) })] })
    const result = materializeDue(doc, ctx)
    expect(result.doc).toBe(doc)
    expect(result.created).toEqual([])
  })

  it('gera uma ocorrência por dia devido, em ordem de data, e avança o cursor', () => {
    const doc = docWith({ series: [dailySeries({ id: seriesId, startsOn: '2026-03-08' })] })
    const { doc: next, created, skipped } = materializeDue(doc, ctx)

    expect(created).toEqual(
      ['2026-03-08', '2026-03-09', '2026-03-10'].map((d) => `${seriesId}:${d}`)
    )
    expect(skipped).toEqual([])
    expect(next.cursors[seriesId]).toBe('2026-03-10')
    expect(childIds(next.items, null)).toEqual(created)
    expect(next.items[created[2]]).toMatchObject({
      text: 'Code review',
      priority: 'p2',
      done: false,
      startsOn: '2026-03-10',
      dueOn: '2026-03-10',
      seriesId,
      occurrenceOn: '2026-03-10',
    })
  })

  it('é idempotente: rodar de novo não cria nada e devolve o mesmo documento', () => {
    const doc = docWith({ series: [dailySeries({ id: seriesId, startsOn: '2026-03-08' })] })
    const first = materializeDue(doc, ctx)
    const second = materializeDue(first.doc, ctx)
    expect(second.created).toEqual([])
    expect(second.doc).toBe(first.doc)
  })

  it('dois documentos divergentes (duas abas) convergem para as mesmas ocorrências', () => {
    const doc = docWith({ series: [dailySeries({ id: seriesId, startsOn: '2026-03-08' })] })
    const tabA = materializeDue(doc, testCtx('2026-03-10', 1)).doc
    const tabB = materializeDue(doc, testCtx('2026-03-10', 9000)).doc
    expect(Object.keys(tabA.items).sort()).toEqual(Object.keys(tabB.items).sort())
  })

  it('série que ainda não começou não gera nada nem cursor', () => {
    const doc = docWith({ series: [dailySeries({ id: seriesId, startsOn: '2026-03-20' })] })
    const result = materializeDue(doc, ctx)
    expect(result.doc).toBe(doc)
  })

  it('só gera depois do cursor', () => {
    const doc = docWith({
      series: [dailySeries({ id: seriesId, startsOn: '2026-03-01' })],
      cursors: { [seriesId]: '2026-03-09' },
    })
    expect(materializeDue(doc, ctx).created).toEqual([`${seriesId}:2026-03-10`])
  })

  it('o cursor nunca recua se o relógio voltar', () => {
    const doc = docWith({
      series: [dailySeries({ id: seriesId, startsOn: '2026-03-01' })],
      cursors: { [seriesId]: '2026-03-20' },
    })
    const result = materializeDue(doc, ctx)
    expect(result.doc).toBe(doc)
    expect(result.doc.cursors[seriesId]).toBe('2026-03-20')
  })

  it('para no fim da série', () => {
    const doc = docWith({
      series: [dailySeries({ id: seriesId, startsOn: '2026-03-01', endsOn: '2026-03-03' })],
    })
    const result = materializeDue(doc, ctx)
    expect(result.created).toHaveLength(3)
    expect(result.doc.cursors[seriesId]).toBe('2026-03-03')
  })

  it('respeita o teto por série, mantém as mais recentes e informa as puladas', () => {
    const doc = docWith({ series: [dailySeries({ id: seriesId, startsOn: '2025-12-01' })] })
    const result = materializeDue(doc, ctx)
    expect(result.created).toHaveLength(TODO_MAX_CATCHUP_PER_SERIES)
    expect(result.created[0]).toBe(`${seriesId}:2026-02-08`)
    expect(result.created.at(-1)).toBe(`${seriesId}:2026-03-10`)
    expect(result.skipped).toEqual([{ seriesId, count: 100 - TODO_MAX_CATCHUP_PER_SERIES }])
  })

  it('respeita o teto total por execução', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      dailySeries({ id: uuid(600 + i), startsOn: '2026-01-01' })
    )
    const result = materializeDue(docWith({ series: many }), ctx)
    expect(result.created).toHaveLength(TODO_MAX_CATCHUP_PER_RUN)
    expect(result.skipped.length).toBeGreaterThan(0)
  })

  it('não conta como pulada a ocorrência que já existe', () => {
    const existing = item({
      id: `${seriesId}:2026-03-09`,
      seriesId,
      occurrenceOn: '2026-03-09',
      startsOn: '2026-03-09',
      dueOn: '2026-03-09',
    })
    const doc = docWith({
      items: [existing],
      series: [dailySeries({ id: seriesId, startsOn: '2026-03-09' })],
    })
    const result = materializeDue(doc, ctx)
    expect(result.created).toEqual([`${seriesId}:2026-03-10`])
    expect(result.skipped).toEqual([])
    expect(result.doc.items[existing.id]).toBe(existing)
  })

  it('clona os subitens do molde, abertos, com ids determinísticos', () => {
    const blueprint = {
      text: 'Deploy',
      priority: 'p1' as const,
      children: [
        { text: 'Build', priority: 'p4' as const, children: [] },
        {
          text: 'Testar',
          priority: 'p4' as const,
          children: [{ text: 'Smoke', priority: 'p4' as const, children: [] }],
        },
      ],
    }
    const doc = docWith({
      series: [dailySeries({ id: seriesId, startsOn: '2026-03-10', blueprint })],
    })
    const { doc: next, created } = materializeDue(doc, ctx)
    const root = created[0]
    const kids = childIds(next.items, root)
    expect(kids).toEqual([`${root}:0`, `${root}:1`])
    expect(next.items[kids[0]]).toMatchObject({ text: 'Build', done: false, seriesId: null })
    expect(childIds(next.items, kids[1])).toEqual([`${root}:2`])
    expect(next.items[`${root}:2`].text).toBe('Smoke')
  })

  it('coloca as ocorrências no fim da faixa de prioridade do pai da série', () => {
    const parent = item({ id: uuid(1) })
    const sibling = item({ id: uuid(2), parentId: parent.id, priority: 'p2', rank: 'a0' })
    const doc = docWith({
      items: [parent, sibling],
      series: [dailySeries({ id: seriesId, parentId: parent.id, startsOn: '2026-03-09' })],
    })
    const { doc: next, created } = materializeDue(doc, ctx)
    expect(childIds(next.items, parent.id)).toEqual([sibling.id, ...created])
  })

  it('reabre o pai concluído que ganhou uma ocorrência aberta', () => {
    const parent = doneItem({ id: uuid(1) })
    const child = doneItem({ id: uuid(2), parentId: parent.id })
    const doc = docWith({
      items: [parent, child],
      series: [dailySeries({ id: seriesId, parentId: parent.id, startsOn: '2026-03-10' })],
    })
    expect(materializeDue(doc, ctx).doc.items[parent.id].done).toBe(false)
  })

  it('pai da série que sumiu: a ocorrência vai para a raiz', () => {
    const doc = docWith({
      series: [dailySeries({ id: seriesId, parentId: uuid(999), startsOn: '2026-03-10' })],
    })
    const { doc: next, created } = materializeDue(doc, ctx)
    expect(next.items[created[0]].parentId).toBeNull()
  })

  it('não passa do teto de itens do documento', () => {
    const filler = Array.from({ length: TODO_MAX_ITEMS }, (_, i) => item({ id: uuid(10_000 + i) }))
    const doc = docWith({
      items: filler,
      series: [dailySeries({ id: seriesId, startsOn: '2026-03-10' })],
    })
    const result = materializeDue(doc, ctx)
    expect(result.created).toEqual([])
    expect(result.skipped).toEqual([{ seriesId, count: 1 }])
  })
})
