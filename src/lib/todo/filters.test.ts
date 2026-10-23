import { buildVisibleRows, normalizeSearch, upcomingPreviews } from '@/lib/todo/filters'
import { dailySeries, docWith, doneItem, item, itemsFrom, uuid } from '@/test/todo-fixtures'

const today = '2026-03-10'
const [open, future, oldDone, doneToday, parent, kidOpen, kidDoneEarlier] = [
  uuid(1),
  uuid(2),
  uuid(3),
  uuid(4),
  uuid(5),
  uuid(6),
  uuid(7),
]

const items = itemsFrom(
  item({ id: open, text: 'Pagar boleto', rank: 'a0' }),
  item({ id: future, text: 'Planejar viagem', rank: 'a1', startsOn: '2026-03-12' }),
  doneItem({ id: oldDone, text: 'Ontem', rank: 'a2' }, '2026-03-09'),
  doneItem({ id: doneToday, text: 'Hoje feito', rank: 'a3' }, today),
  item({ id: parent, text: 'Revisão do contrato', rank: 'a4' }),
  item({ id: kidOpen, text: 'Ler cláusulas', parentId: parent, rank: 'a0' }),
  doneItem({ id: kidDoneEarlier, text: 'Pedir cópia', parentId: parent, rank: 'a1' }, '2026-03-08')
)

const base = { query: '', today, collapsed: {} }
const ids = (rows: { id: string }[]) => rows.map((row) => row.id)

describe('buildVisibleRows', () => {
  it('Hoje: ativos, concluídos hoje e o checklist inteiro de um pai presente', () => {
    const rows = buildVisibleRows(items, { ...base, view: 'today' })
    // abertos primeiro (por rank), concluídos no fim
    expect(ids(rows)).toEqual([open, parent, kidOpen, kidDoneEarlier, doneToday])
    expect(rows.find((row) => row.id === kidOpen)).toMatchObject({ depth: 1, isContext: false })
  })

  it('Hoje: esconde o agendado para depois e o concluído em outro dia', () => {
    const listed = ids(buildVisibleRows(items, { ...base, view: 'today' }))
    expect(listed).not.toContain(future)
    expect(listed).not.toContain(oldDone)
  })

  it('Próximos: só o que começa depois de hoje', () => {
    expect(ids(buildVisibleRows(items, { ...base, view: 'upcoming' }))).toEqual([future])
  })

  it('Todos: tudo, na ordem de exibição', () => {
    expect(ids(buildVisibleRows(items, { ...base, view: 'all' }))).toEqual([
      open,
      future,
      parent,
      kidOpen,
      kidDoneEarlier,
      oldDone,
      doneToday,
    ])
  })

  it('um pai agendado para depois aparece como contexto se um filho está ativo hoje', () => {
    const scheduled = itemsFrom(
      item({ id: parent, startsOn: '2026-03-20' }),
      item({ id: kidOpen, parentId: parent })
    )
    const rows = buildVisibleRows(scheduled, { ...base, view: 'today' })
    expect(rows).toEqual([
      { id: parent, depth: 0, hasChildren: true, collapsed: false, isContext: true },
      { id: kidOpen, depth: 1, hasChildren: false, collapsed: false, isContext: false },
    ])
  })

  describe('recolhimento', () => {
    it('esconde os filhos de um pai recolhido, mantendo hasChildren', () => {
      const rows = buildVisibleRows(items, { ...base, view: 'all', collapsed: { [parent]: true } })
      expect(ids(rows)).not.toContain(kidOpen)
      expect(rows.find((row) => row.id === parent)).toMatchObject({
        hasChildren: true,
        collapsed: true,
      })
    })

    it('durante a busca nada fica recolhido', () => {
      const rows = buildVisibleRows(items, {
        ...base,
        view: 'all',
        query: 'cláusulas',
        collapsed: { [parent]: true },
      })
      expect(ids(rows)).toEqual([parent, kidOpen])
    })
  })

  describe('busca', () => {
    it('ignora acento e caixa e mostra o pai como contexto esmaecido', () => {
      const rows = buildVisibleRows(items, { ...base, view: 'all', query: 'CLAUSULAS' })
      expect(rows).toEqual([
        { id: parent, depth: 0, hasChildren: true, collapsed: false, isContext: true },
        { id: kidOpen, depth: 1, hasChildren: false, collapsed: false, isContext: false },
      ])
    })

    it('um pai que casa mostra o checklist inteiro', () => {
      const rows = buildVisibleRows(items, { ...base, view: 'all', query: 'revisao' })
      expect(ids(rows)).toEqual([parent, kidOpen, kidDoneEarlier])
      expect(rows[0].isContext).toBe(false)
    })

    it('sem resultado devolve vazio', () => {
      expect(buildVisibleRows(items, { ...base, view: 'all', query: 'zzz' })).toEqual([])
    })
  })

  it('holdOpen mantém o recém-concluído no lugar de aberto', () => {
    const justDone = doneItem({ id: uuid(10), rank: 'a0' })
    const after = item({ id: uuid(11), rank: 'a1' })
    const list = itemsFrom(justDone, after)
    const normal = buildVisibleRows(list, { ...base, view: 'all' })
    const held = buildVisibleRows(list, { ...base, view: 'all', holdOpen: new Set([justDone.id]) })
    expect(ids(normal)).toEqual([after.id, justDone.id])
    expect(ids(held)).toEqual([justDone.id, after.id])
  })

  it('normalizeSearch tira acento, caixa e espaços nas pontas', () => {
    expect(normalizeSearch('  Ação Útil ')).toBe('acao util')
  })
})

describe('upcomingPreviews', () => {
  const seriesId = uuid(500)

  it('mostra a próxima data depois do que já foi gerado', () => {
    const doc = docWith({
      series: [
        dailySeries({
          id: seriesId,
          rule: { freq: 'weekly', interval: 1, weekdays: [3], weekStartsOn: 0 },
          startsOn: '2026-03-04',
        }),
      ],
      cursors: { [seriesId]: today },
    })
    expect(upcomingPreviews(doc, today)).toEqual([
      { seriesId, text: 'Code review', priority: 'p2', date: '2026-03-11' },
    ])
  })

  it('não mostra série que termina antes da próxima data', () => {
    const doc = docWith({ series: [dailySeries({ id: seriesId, endsOn: today })] })
    expect(upcomingPreviews(doc, today)).toEqual([])
  })

  it('ordena por data, prioridade e texto', () => {
    const early = dailySeries({
      id: uuid(501),
      blueprint: { text: 'B', priority: 'p4', children: [] },
    })
    const high = dailySeries({
      id: uuid(502),
      blueprint: { text: 'C', priority: 'p1', children: [] },
    })
    const alpha = dailySeries({
      id: uuid(503),
      blueprint: { text: 'A', priority: 'p4', children: [] },
    })
    const monthly = dailySeries({
      id: uuid(504),
      rule: { freq: 'monthly', interval: 1, day: 20 },
      startsOn: '2026-03-01',
      blueprint: { text: 'Mensal', priority: 'p1', children: [] },
    })
    const texts = upcomingPreviews(docWith({ series: [early, high, alpha, monthly] }), today).map(
      (p) => p.text
    )
    expect(texts).toEqual(['C', 'A', 'B', 'Mensal'])
  })
})
