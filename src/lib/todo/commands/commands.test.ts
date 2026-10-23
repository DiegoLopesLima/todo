import { TODO_MAX_DEPTH, TODO_MAX_ITEMS, TODO_MAX_TEXT_LENGTH } from '@/constants/todo'
import { type Command, type RunResult, runCommand, runMaterialize } from '@/lib/todo/commands'
import { childIds } from '@/lib/todo/tree'
import type { TodoDocument } from '@/lib/validations/todo'
import { dailySeries, docWith, doneItem, emptyDoc, item, testCtx, uuid } from '@/test/todo-fixtures'

type Ok = Extract<RunResult, { ok: true }>

function must(result: RunResult): Ok {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
  return result
}

function reason(result: RunResult): string {
  if (result.ok) throw new Error('expected failure')
  return result.reason
}

const ctx = testCtx('2026-03-10')
const run = (doc: TodoDocument, cmd: Command) => runCommand(doc, cmd, ctx)

/** Cria um item e devolve o documento novo e o id gerado. */
function create(
  doc: TodoDocument,
  text: string,
  extra: Partial<Extract<Command, { type: 'createItem' }>> = {}
) {
  const result = must(run(doc, { type: 'createItem', text, parentId: null, ...extra }))
  return { doc: result.doc, id: result.events[0].itemId as string }
}

describe('createItem', () => {
  it('cria no fim da faixa, p4 por padrão, e registra o evento', () => {
    const first = create(emptyDoc(), 'Pagar boleto')
    const second = create(first.doc, 'Ligar para o banco')
    expect(childIds(second.doc.items, null)).toEqual([first.id, second.id])
    expect(second.doc.items[second.id]).toMatchObject({
      priority: 'p4',
      done: false,
      parentId: null,
    })
    expect(second.doc.history.at(-1)).toMatchObject({
      type: 'created',
      itemId: second.id,
      origin: 'user',
    })
    expect(second.doc.rev).toBe(2)
    expect(second.doc.meta.changesSinceExport).toBe(2)
  })

  it('o item novo fica depois dos da própria prioridade e antes dos de prioridade menor', () => {
    let doc = create(emptyDoc(), 'a', { priority: 'p2' }).doc
    doc = create(doc, 'b', { priority: 'p4' }).doc
    const added = create(doc, 'c', { priority: 'p2' })
    expect(childIds(added.doc.items, null).map((id) => added.doc.items[id].text)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('apara o texto', () => {
    const { doc, id } = create(emptyDoc(), '  espaços  ')
    expect(doc.items[id].text).toBe('espaços')
  })

  it.each([
    ['texto vazio', { text: '   ' }, 'empty-text'],
    ['texto grande demais', { text: 'x'.repeat(TODO_MAX_TEXT_LENGTH + 1) }, 'text-too-long'],
    ['pai inexistente', { text: 'ok', parentId: uuid(999) }, 'not-found'],
    [
      'início depois do prazo',
      { text: 'ok', startsOn: '2026-03-12', dueOn: '2026-03-10' },
      'invalid-dates',
    ],
    ['data inexistente', { text: 'ok', dueOn: '2026-02-31' }, 'invalid-dates'],
  ] as const)('recusa %s', (_label, fields, expected) => {
    expect(reason(run(emptyDoc(), { type: 'createItem', parentId: null, ...fields }))).toBe(
      expected
    )
  })

  it('recusa passar do último nível', () => {
    const chain = Array.from({ length: TODO_MAX_DEPTH }, (_, i) =>
      item({ id: uuid(100 + i), parentId: i === 0 ? null : uuid(99 + i) })
    )
    const doc = docWith({ items: chain })
    expect(
      reason(
        run(doc, { type: 'createItem', text: 'fundo', parentId: uuid(100 + TODO_MAX_DEPTH - 1) })
      )
    ).toBe('depth')
  })

  it('recusa passar do teto de itens', () => {
    const filler = Array.from({ length: TODO_MAX_ITEMS }, (_, i) => item({ id: uuid(10_000 + i) }))
    expect(
      reason(run(docWith({ items: filler }), { type: 'createItem', text: 'x', parentId: null }))
    ).toBe('limit')
  })

  it('criar um filho aberto reabre o pai concluído', () => {
    const doc = docWith({ items: [doneItem({ id: uuid(1) })] })
    const result = must(run(doc, { type: 'createItem', text: 'novo', parentId: uuid(1) }))
    expect(result.doc.items[uuid(1)].done).toBe(false)
  })

  it('criar um item aberto desfaz o dia zerado', () => {
    const cleared = must(
      run(docWith({ items: [item({ id: uuid(1) })] }), {
        type: 'toggleDone',
        id: uuid(1),
        done: true,
      })
    )
    expect(cleared.doc.clearedDays['2026-03-10']).toBe(true)
    const reopened = must(run(cleared.doc, { type: 'createItem', text: 'mais um', parentId: null }))
    expect(reopened.doc.clearedDays['2026-03-10']).toBeUndefined()
  })
})

describe('editItem', () => {
  const base = docWith({
    items: [
      item({ id: uuid(1), text: 'a', priority: 'p2', rank: 'a0' }),
      item({ id: uuid(2), text: 'b', priority: 'p4', rank: 'a0' }),
      item({ id: uuid(3), text: 'c', priority: 'p4', rank: 'a1' }),
    ],
  })

  it('edita o texto e registra o antes e o depois', () => {
    const result = must(run(base, { type: 'editItem', id: uuid(1), patch: { text: 'a2' } }))
    expect(result.doc.items[uuid(1)].text).toBe('a2')
    expect(result.events[0]).toMatchObject({
      type: 'edited',
      changes: [{ field: 'text', from: 'a', to: 'a2' }],
    })
  })

  it('mudar a prioridade leva o item para o fim da nova faixa', () => {
    const result = must(run(base, { type: 'editItem', id: uuid(1), patch: { priority: 'p4' } }))
    expect(childIds(result.doc.items, null)).toEqual([uuid(2), uuid(3), uuid(1)])
  })

  it('aceita datas e limpa com null', () => {
    const set = must(
      run(base, {
        type: 'editItem',
        id: uuid(1),
        patch: { startsOn: '2026-03-12', dueOn: '2026-03-15' },
      })
    )
    expect(set.doc.items[uuid(1)]).toMatchObject({ startsOn: '2026-03-12', dueOn: '2026-03-15' })
    const cleared = must(run(set.doc, { type: 'editItem', id: uuid(1), patch: { startsOn: null } }))
    expect(cleared.doc.items[uuid(1)].startsOn).toBeNull()
  })

  it('recusa início depois do prazo, sem mudança, texto vazio e item inexistente', () => {
    const dated = must(
      run(base, { type: 'editItem', id: uuid(1), patch: { dueOn: '2026-03-10' } })
    ).doc
    expect(
      reason(run(dated, { type: 'editItem', id: uuid(1), patch: { startsOn: '2026-03-12' } }))
    ).toBe('invalid-dates')
    expect(reason(run(base, { type: 'editItem', id: uuid(1), patch: { text: 'a' } }))).toBe(
      'no-change'
    )
    expect(reason(run(base, { type: 'editItem', id: uuid(1), patch: { text: ' ' } }))).toBe(
      'empty-text'
    )
    expect(reason(run(base, { type: 'editItem', id: uuid(99), patch: { text: 'x' } }))).toBe(
      'not-found'
    )
  })
})

describe('toggleDone', () => {
  const family = docWith({
    items: [
      item({ id: uuid(1) }),
      item({ id: uuid(2), parentId: uuid(1), rank: 'a0' }),
      item({ id: uuid(3), parentId: uuid(1), rank: 'a1' }),
      item({ id: uuid(4), rank: 'a1' }),
    ],
  })

  it('um evento por item que mudou, com a celebração do pai concluído', () => {
    const result = must(run(family, { type: 'toggleDone', id: uuid(1), done: true }))
    expect(result.events.map((e) => [e.type, e.itemId])).toEqual([
      ['completed', uuid(1)],
      ['completed', uuid(2)],
      ['completed', uuid(3)],
    ])
    expect(result.celebrate).toBe('parent')
  })

  it('zerar o dia dispara a celebração do dia e marca o dia', () => {
    const half = must(run(family, { type: 'toggleDone', id: uuid(1), done: true })).doc
    const result = must(run(half, { type: 'toggleDone', id: uuid(4), done: true }))
    expect(result.celebrate).toBe('day')
    expect(result.doc.clearedDays['2026-03-10']).toBe(true)
  })

  it('reabrir algo desmarca o dia zerado', () => {
    const all = must(
      run(must(run(family, { type: 'toggleDone', id: uuid(1), done: true })).doc, {
        type: 'toggleDone',
        id: uuid(4),
        done: true,
      })
    ).doc
    const reopened = must(run(all, { type: 'toggleDone', id: uuid(2), done: false }))
    expect(reopened.doc.clearedDays['2026-03-10']).toBeUndefined()
    expect(reopened.events.map((e) => e.type)).toEqual(['reopened', 'reopened'])
  })

  it('sem mudança e item inexistente são recusados', () => {
    expect(reason(run(family, { type: 'toggleDone', id: uuid(4), done: false }))).toBe('no-change')
    expect(reason(run(family, { type: 'toggleDone', id: uuid(99), done: true }))).toBe('not-found')
  })
})

describe('moveItem', () => {
  const tree = docWith({
    items: [
      item({ id: uuid(1), rank: 'a0' }),
      item({ id: uuid(2), parentId: uuid(1), rank: 'a0' }),
      doneItem({ id: uuid(3), parentId: uuid(1), rank: 'a1' }),
      item({ id: uuid(4), rank: 'a1' }),
    ],
  })

  it('mudar de pai registra "movido" e conclui o pai antigo que ficou só com concluídos', () => {
    const result = must(
      run(tree, { type: 'moveItem', id: uuid(2), parentId: uuid(4), priority: 'p4', rank: 'a0' })
    )
    expect(result.doc.items[uuid(2)].parentId).toBe(uuid(4))
    expect(result.doc.items[uuid(1)].done).toBe(true)
    expect(result.events[0]).toMatchObject({ type: 'moved' })
  })

  it('só o rank mudou: "reordenado"', () => {
    const result = must(
      run(tree, { type: 'moveItem', id: uuid(4), parentId: null, priority: 'p4', rank: 'Zz' })
    )
    expect(result.events[0]).toMatchObject({ type: 'reordered' })
    expect(childIds(result.doc.items, null)).toEqual([uuid(4), uuid(1)])
  })

  it('mudar só a prioridade é "movido"', () => {
    const result = must(
      run(tree, { type: 'moveItem', id: uuid(4), parentId: null, priority: 'p1', rank: 'a0' })
    )
    expect(result.events[0].type).toBe('moved')
  })

  it('recusa ciclo, si mesmo, inexistente e quando nada muda', () => {
    const move = (id: string, parentId: string | null, rank = 'a0') =>
      run(tree, { type: 'moveItem', id, parentId, priority: 'p4', rank })
    expect(reason(move(uuid(1), uuid(2)))).toBe('cycle')
    expect(reason(move(uuid(1), uuid(1)))).toBe('self')
    expect(reason(move(uuid(99), null))).toBe('not-found')
    expect(reason(move(uuid(1), null, 'a0'))).toBe('no-change')
  })
})

describe('deleteItem', () => {
  it('remove a subárvore e registra a contagem', () => {
    const doc = docWith({
      items: [
        item({ id: uuid(1) }),
        item({ id: uuid(2), parentId: uuid(1) }),
        item({ id: uuid(3), rank: 'a1' }),
      ],
    })
    const result = must(run(doc, { type: 'deleteItem', id: uuid(1) }))
    expect(Object.keys(result.doc.items)).toEqual([uuid(3)])
    expect(result.events[0]).toMatchObject({ type: 'deleted', itemId: uuid(1), count: 2 })
  })

  it('excluir o último filho aberto conclui o pai', () => {
    const doc = docWith({
      items: [
        item({ id: uuid(1) }),
        item({ id: uuid(2), parentId: uuid(1), rank: 'a0' }),
        doneItem({ id: uuid(3), parentId: uuid(1), rank: 'a1' }),
      ],
    })
    expect(must(run(doc, { type: 'deleteItem', id: uuid(2) })).doc.items[uuid(1)].done).toBe(true)
  })

  it('remove as séries penduradas no item excluído', () => {
    const doc = docWith({
      items: [item({ id: uuid(1) })],
      series: [dailySeries({ id: uuid(500), parentId: uuid(1) })],
      cursors: { [uuid(500)]: '2026-03-10' },
    })
    const result = must(run(doc, { type: 'deleteItem', id: uuid(1) }))
    expect(result.doc.series).toEqual({})
    expect(result.doc.cursors).toEqual({})
  })

  it('item inexistente é recusado', () => {
    expect(reason(run(emptyDoc(), { type: 'deleteItem', id: uuid(1) }))).toBe('not-found')
  })
})

describe('séries', () => {
  const rule = { freq: 'daily', interval: 1 } as const

  function seeded(startsOn = '2026-03-09') {
    return must(
      run(emptyDoc(), { type: 'createSeries', text: 'Code review', parentId: null, rule, startsOn })
    )
  }

  it('criar uma série gera já as ocorrências devidas e registra tudo', () => {
    const result = seeded()
    const [seriesId] = Object.keys(result.doc.series)
    expect(Object.keys(result.doc.items)).toEqual([
      `${seriesId}:2026-03-09`,
      `${seriesId}:2026-03-10`,
    ])
    expect(result.doc.cursors[seriesId]).toBe('2026-03-10')
    expect(result.events.map((e) => [e.type, e.origin])).toEqual([
      ['series_created', 'user'],
      ['occurrence_created', 'system'],
      ['occurrence_created', 'system'],
    ])
  })

  it('série que começa no futuro não gera nada ainda', () => {
    const result = seeded('2026-03-20')
    expect(result.doc.items).toEqual({})
    expect(Object.keys(result.doc.series)).toHaveLength(1)
  })

  it('cria com subitens no molde', () => {
    const result = must(
      run(emptyDoc(), {
        type: 'createSeries',
        text: 'Deploy',
        parentId: null,
        rule,
        startsOn: '2026-03-10',
        children: [{ text: 'Build', priority: 'p4', children: [] }],
      })
    )
    expect(Object.keys(result.doc.items)).toHaveLength(2)
  })

  it('recusa regra inválida, datas inválidas, texto vazio e molde fundo demais', () => {
    const base = {
      type: 'createSeries',
      text: 'x',
      parentId: null,
      rule,
      startsOn: '2026-03-10',
    } as const
    expect(reason(run(emptyDoc(), { ...base, rule: { freq: 'daily', interval: 0 } }))).toBe(
      'invalid-rule'
    )
    expect(reason(run(emptyDoc(), { ...base, endsOn: '2026-03-01' }))).toBe('invalid-dates')
    expect(reason(run(emptyDoc(), { ...base, text: ' ' }))).toBe('empty-text')
    type Node = { text: string; priority: 'p4'; children: Node[] }
    const deep = (level: number): Node => ({
      text: 'n',
      priority: 'p4',
      children: level === 0 ? [] : [deep(level - 1)],
    })
    expect(reason(run(emptyDoc(), { ...base, children: [deep(TODO_MAX_DEPTH)] }))).toBe('depth')
  })

  it('transforma um item (e subitens) numa série', () => {
    const doc = docWith({
      items: [
        item({ id: uuid(1), text: 'Revisar' }),
        item({ id: uuid(2), text: 'Passo', parentId: uuid(1) }),
      ],
    })
    const result = must(
      run(doc, { type: 'makeRecurring', id: uuid(1), rule, startsOn: '2026-03-10' })
    )
    expect(result.doc.items[uuid(1)]).toBeUndefined()
    const [series] = Object.values(result.doc.series)
    expect(series.blueprint).toMatchObject({ text: 'Revisar', children: [{ text: 'Passo' }] })
    expect(
      Object.values(result.doc.items)
        .map((i) => i.text)
        .sort()
    ).toEqual(['Passo', 'Revisar'])
  })

  it('não transforma uma ocorrência nem um item com séries dentro', () => {
    const generated = seeded()
    const [occurrence] = Object.keys(generated.doc.items)
    expect(
      reason(
        run(generated.doc, { type: 'makeRecurring', id: occurrence, rule, startsOn: '2026-03-10' })
      )
    ).toBe('invalid-target')
  })

  describe('editar', () => {
    it('texto e prioridade do molde, e das ocorrências abertas a partir de uma data', () => {
      const created = seeded('2026-03-08')
      const [seriesId] = Object.keys(created.doc.series)
      const result = must(
        run(created.doc, {
          type: 'editSeries',
          id: seriesId,
          patch: { text: 'Revisão de PR', priority: 'p1' },
          fromDate: '2026-03-10',
        })
      )
      expect(result.doc.series[seriesId].blueprint).toMatchObject({
        text: 'Revisão de PR',
        priority: 'p1',
      })
      expect(result.doc.items[`${seriesId}:2026-03-10`]).toMatchObject({
        text: 'Revisão de PR',
        priority: 'p1',
      })
      expect(result.doc.items[`${seriesId}:2026-03-09`].text).toBe('Code review')
    })

    it('mudar a regra recomeça no primeiro dia ainda não gerado', () => {
      const created = seeded('2026-03-01')
      const [seriesId] = Object.keys(created.doc.series)
      const result = must(
        run(created.doc, {
          type: 'editSeries',
          id: seriesId,
          patch: { rule: { freq: 'daily', interval: 3 } },
        })
      )
      expect(result.doc.series[seriesId].startsOn).toBe('2026-03-11')
    })

    it('recusa sem mudança, série inexistente e fim antes do início', () => {
      const created = seeded('2026-03-01')
      const [seriesId] = Object.keys(created.doc.series)
      expect(
        reason(
          run(created.doc, { type: 'editSeries', id: seriesId, patch: { text: 'Code review' } })
        )
      ).toBe('no-change')
      expect(
        reason(run(created.doc, { type: 'editSeries', id: uuid(999), patch: { text: 'x' } }))
      ).toBe('not-found')
      expect(
        reason(
          run(created.doc, { type: 'editSeries', id: seriesId, patch: { endsOn: '2026-02-01' } })
        )
      ).toBe('invalid-dates')
    })
  })

  it('aplicar a estrutura de uma ocorrência às próximas', () => {
    const created = seeded('2026-03-10')
    const [seriesId] = Object.keys(created.doc.series)
    const occurrenceId = `${seriesId}:2026-03-10`
    const withChild = create(created.doc, 'Subitem novo', { parentId: occurrenceId }).doc
    const result = must(run(withChild, { type: 'applyStructureToSeries', itemId: occurrenceId }))
    expect(result.doc.series[seriesId].blueprint.children).toEqual([
      { text: 'Subitem novo', priority: 'p4', children: [] },
    ])
  })

  it('encerrar define o fim como ontem e mantém as ocorrências', () => {
    const created = seeded('2026-03-08')
    const [seriesId] = Object.keys(created.doc.series)
    const result = must(run(created.doc, { type: 'endSeries', id: seriesId }))
    expect(result.doc.series[seriesId].endsOn).toBe('2026-03-09')
    expect(Object.keys(result.doc.items)).toHaveLength(3)
    expect(result.events[0].type).toBe('series_ended')
  })

  it('encerrar uma série que ainda não começou a remove', () => {
    const created = seeded('2026-03-20')
    const [seriesId] = Object.keys(created.doc.series)
    expect(must(run(created.doc, { type: 'endSeries', id: seriesId })).doc.series).toEqual({})
  })

  describe('excluir', () => {
    it('remove as abertas e mantém as concluídas, desvinculadas', () => {
      const created = seeded('2026-03-08')
      const [seriesId] = Object.keys(created.doc.series)
      const done = must(
        run(created.doc, { type: 'toggleDone', id: `${seriesId}:2026-03-08`, done: true })
      ).doc
      const result = must(run(done, { type: 'deleteSeries', id: seriesId, deleteDone: false }))
      expect(result.doc.series).toEqual({})
      expect(result.doc.cursors).toEqual({})
      expect(Object.values(result.doc.items)).toHaveLength(1)
      expect(Object.values(result.doc.items)[0]).toMatchObject({
        done: true,
        seriesId: null,
        occurrenceOn: null,
      })
    })

    it('com deleteDone remove as concluídas também', () => {
      const created = seeded('2026-03-08')
      const [seriesId] = Object.keys(created.doc.series)
      const done = must(
        run(created.doc, { type: 'toggleDone', id: `${seriesId}:2026-03-08`, done: true })
      ).doc
      expect(
        must(run(done, { type: 'deleteSeries', id: seriesId, deleteDone: true })).doc.items
      ).toEqual({})
    })
  })
})

describe('operações em lote', () => {
  it('dispensar atrasados remove só ocorrências abertas e vencidas', () => {
    const created = must(
      run(emptyDoc(), {
        type: 'createSeries',
        text: 'Code review',
        parentId: null,
        rule: { freq: 'daily', interval: 1 },
        startsOn: '2026-03-05',
      })
    ).doc
    const withPlain = create(created, 'Tarefa comum atrasada', { dueOn: '2026-03-01' }).doc
    const result = must(run(withPlain, { type: 'dismissOverdue' }))
    const left = Object.values(result.doc.items)
    expect(left.map((i) => i.text).sort()).toEqual(['Code review', 'Tarefa comum atrasada'])
    expect(left.find((i) => i.text === 'Code review')?.occurrenceOn).toBe('2026-03-10')
    expect(result.events[0]).toMatchObject({ type: 'occurrences_dismissed', count: 5 })
  })

  it('dispensar só as mais antigas que N dias', () => {
    const created = must(
      run(emptyDoc(), {
        type: 'createSeries',
        text: 'x',
        parentId: null,
        rule: { freq: 'daily', interval: 1 },
        startsOn: '2026-03-05',
      })
    ).doc
    const result = must(run(created, { type: 'dismissOverdue', olderThanDays: 2 }))
    expect(
      Object.values(result.doc.items)
        .map((i) => i.occurrenceOn)
        .sort()
    ).toEqual(['2026-03-08', '2026-03-09', '2026-03-10'])
  })

  it('sem atrasados não há o que dispensar', () => {
    expect(reason(run(emptyDoc(), { type: 'dismissOverdue' }))).toBe('no-change')
  })

  it('ordenar por prazo reescreve só o necessário', () => {
    const doc = docWith({
      items: [
        item({ id: uuid(1), rank: 'a0', dueOn: '2026-03-20' }),
        item({ id: uuid(2), rank: 'a1', dueOn: '2026-03-12' }),
      ],
    })
    const result = must(run(doc, { type: 'sortByDue', parentId: null }))
    expect(childIds(result.doc.items, null)).toEqual([uuid(2), uuid(1)])
    expect(reason(run(result.doc, { type: 'sortByDue', parentId: null }))).toBe('no-change')
  })

  it('limpar concluídos remove só os de primeiro nível mais antigos que N dias', () => {
    const doc = docWith({
      items: [
        doneItem({ id: uuid(1), rank: 'a0' }, '2026-02-01'),
        doneItem({ id: uuid(2), rank: 'a1' }, '2026-03-09'),
        item({ id: uuid(3), rank: 'a2' }),
        doneItem({ id: uuid(4), parentId: uuid(3), rank: 'a0' }, '2026-02-01'),
      ],
    })
    const result = must(run(doc, { type: 'clearCompleted', olderThanDays: 7 }))
    expect(Object.keys(result.doc.items).sort()).toEqual([uuid(2), uuid(3), uuid(4)].sort())
  })
})

describe('runMaterialize', () => {
  it('gera as ocorrências devidas, registra como sistema e não conta como alteração', () => {
    const doc = docWith({ series: [dailySeries({ id: uuid(500), startsOn: '2026-03-09' })] })
    const result = runMaterialize(doc, ctx)
    expect(result.changed).toBe(true)
    expect(result.events.map((e) => [e.type, e.origin])).toEqual([
      ['occurrence_created', 'system'],
      ['occurrence_created', 'system'],
    ])
    expect(result.doc.rev).toBe(doc.rev + 1)
    expect(result.doc.meta.changesSinceExport).toBe(0)
    expect(runMaterialize(result.doc, ctx).changed).toBe(false)
  })

  it('informa as ocorrências puladas pelos tetos', () => {
    const doc = docWith({ series: [dailySeries({ id: uuid(500), startsOn: '2025-12-01' })] })
    const result = runMaterialize(doc, ctx)
    expect(result.events.at(-1)).toMatchObject({ type: 'occurrences_skipped', count: 69 })
  })

  it('uma ocorrência nova aberta desfaz o dia zerado', () => {
    const doc = {
      ...docWith({
        items: [doneItem({ id: uuid(1) })],
        series: [dailySeries({ id: uuid(500), startsOn: '2026-03-10' })],
      }),
      clearedDays: { '2026-03-10': true as const },
    }
    expect(runMaterialize(doc, ctx).doc.clearedDays).toEqual({})
  })
})
