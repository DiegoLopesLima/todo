import { ONE_DAY_IN_MS } from '@/constants/time'
import {
  TODO_HISTORY_MAX_AGE_DAYS,
  TODO_HISTORY_MAX_CHANGES,
  TODO_HISTORY_MAX_EVENTS,
  TODO_HISTORY_MERGE_WINDOW_MS,
  TODO_HISTORY_TEXT_LENGTH,
} from '@/constants/todo'
import { HISTORY_EVENT_TYPES } from '@/enums/todo'
import {
  appendHistory,
  buildEvent,
  change,
  type EventDraft,
  filterHistory,
  HISTORY_CATEGORIES,
  truncateText,
  undoneEventIds,
} from '@/lib/todo/history'
import type { HistoryEvent } from '@/lib/validations/todo'
import { testCtx, uuid } from '@/test/todo-fixtures'

const ctx = testCtx('2026-03-10')
const at = (ms: number) => new Date(ctx.now.getTime() + ms).toISOString()

function event(overrides: Partial<HistoryEvent> & { id: string }): HistoryEvent {
  return {
    at: at(0),
    type: 'created',
    itemId: uuid(1),
    itemText: 'x',
    origin: 'user',
    ...overrides,
  }
}

describe('history', () => {
  describe('buildEvent', () => {
    it('completa id, instante e origem (padrão: a pessoa)', () => {
      const built = buildEvent({ type: 'created', itemId: uuid(1), itemText: 'Pagar' }, ctx)
      expect(built).toMatchObject({ type: 'created', origin: 'user', at: ctx.now.toISOString() })
      expect(built.id).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('respeita a origem do rascunho', () => {
      const draft: EventDraft = {
        type: 'occurrence_created',
        itemId: uuid(1),
        itemText: 'x',
        origin: 'system',
      }
      expect(buildEvent(draft, ctx).origin).toBe('system')
    })

    it('corta o texto e o número de mudanças detalhadas', () => {
      const built = buildEvent(
        {
          type: 'edited',
          itemId: uuid(1),
          itemText: 'y'.repeat(TODO_HISTORY_TEXT_LENGTH + 50),
          changes: Array.from({ length: TODO_HISTORY_MAX_CHANGES + 3 }, (_, i) =>
            change(`f${i}`, 'a', 'b')
          ),
        },
        ctx
      )
      expect(built.itemText).toHaveLength(TODO_HISTORY_TEXT_LENGTH)
      expect(built.changes).toHaveLength(TODO_HISTORY_MAX_CHANGES)
    })
  })

  it('truncateText só corta o que passa do limite', () => {
    expect(truncateText('curto')).toBe('curto')
    expect(truncateText('abcdef', 4)).toBe('abc…')
  })

  describe('appendHistory', () => {
    it('acrescenta em ordem', () => {
      const result = appendHistory([event({ id: 'a' })], [event({ id: 'b' })], ctx)
      expect(result.map((e) => e.id)).toEqual(['a', 'b'])
    })

    it('funde reordenações seguidas do mesmo item dentro da janela', () => {
      const first = event({
        id: 'a',
        type: 'reordered',
        changes: [{ field: 'rank', from: 'a0', to: 'a1' }],
      })
      const second = event({
        id: 'b',
        type: 'reordered',
        at: at(TODO_HISTORY_MERGE_WINDOW_MS),
        changes: [{ field: 'rank', from: 'a1', to: 'a2' }],
      })
      const result = appendHistory([first], [second], ctx)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'a',
        at: second.at,
        changes: [{ field: 'rank', from: 'a0', to: 'a2' }],
      })
    })

    it('não funde fora da janela, outro item ou outro tipo', () => {
      const first = event({
        id: 'a',
        type: 'reordered',
        changes: [{ field: 'rank', from: 'a0', to: 'a1' }],
      })
      const late = event({ id: 'b', type: 'reordered', at: at(TODO_HISTORY_MERGE_WINDOW_MS + 1) })
      const other = event({ id: 'c', type: 'reordered', itemId: uuid(2) })
      const moved = event({ id: 'd', type: 'moved' })
      expect(appendHistory([first], [late], ctx)).toHaveLength(2)
      expect(appendHistory([first], [other], ctx)).toHaveLength(2)
      expect(appendHistory([first], [moved], ctx)).toHaveLength(2)
    })

    it('poda o que passou da idade máxima', () => {
      const old = event({ id: 'old', at: at(-(TODO_HISTORY_MAX_AGE_DAYS + 1) * ONE_DAY_IN_MS) })
      const recent = event({ id: 'recent', at: at(-ONE_DAY_IN_MS) })
      expect(appendHistory([old, recent], [], ctx).map((e) => e.id)).toEqual(['recent'])
    })

    it('poda os mais antigos acima do limite de eventos', () => {
      const many = Array.from({ length: TODO_HISTORY_MAX_EVENTS + 10 }, (_, i) =>
        event({ id: String(i) })
      )
      const result = appendHistory([], many, ctx)
      expect(result).toHaveLength(TODO_HISTORY_MAX_EVENTS)
      expect(result[0].id).toBe('10')
    })
  })

  describe('filterHistory', () => {
    const history = [
      event({ id: '1', type: 'created', itemId: uuid(1) }),
      event({ id: '2', type: 'completed', itemId: uuid(1) }),
      event({ id: '3', type: 'completed', itemId: uuid(2), origin: 'system' }),
      event({ id: '4', type: 'reopened', itemId: uuid(1), at: at(3 * ONE_DAY_IN_MS) }),
    ]

    it('devolve do mais novo para o mais antigo', () => {
      expect(filterHistory(history, {}).map((e) => e.id)).toEqual(['4', '3', '2', '1'])
    })

    it('filtra por item, tipo e origem', () => {
      expect(filterHistory(history, { itemId: uuid(1) }).map((e) => e.id)).toEqual(['4', '2', '1'])
      expect(filterHistory(history, { types: ['completed'] }).map((e) => e.id)).toEqual(['3', '2'])
      expect(filterHistory(history, { origin: 'system' }).map((e) => e.id)).toEqual(['3'])
    })

    it('filtra pelo texto do item, sem acento nem caixa (o histórico guarda o texto)', () => {
      const texts = [
        event({ id: 'a', itemText: 'Revisão do contrato' }),
        event({ id: 'b', itemText: 'Comprar pão' }),
      ]
      expect(filterHistory(texts, { text: 'REVISAO' }).map((e) => e.id)).toEqual(['a'])
      expect(filterHistory(texts, { text: '  ' }).map((e) => e.id)).toEqual(['b', 'a'])
      expect(filterHistory(texts, { text: 'zzz' })).toEqual([])
    })

    it('filtra por período, em dias locais inclusivos', () => {
      expect(filterHistory(history, { from: '2026-03-11' }).map((e) => e.id)).toEqual(['4'])
      expect(filterHistory(history, { to: '2026-03-10' }).map((e) => e.id)).toEqual(['3', '2', '1'])
      expect(filterHistory(history, { from: '2026-03-10', to: '2026-03-10' })).toHaveLength(3)
    })
  })

  it('cada tipo de evento pertence a exatamente uma categoria do filtro', () => {
    const listed = Object.values(HISTORY_CATEGORIES).flat()
    expect([...listed].sort()).toEqual([...HISTORY_EVENT_TYPES].sort())
    expect(new Set(listed).size).toBe(listed.length)
  })

  it('undoneEventIds acompanha desfeito e refeito', () => {
    const history = [
      event({ id: 'a' }),
      event({ id: 'b', type: 'undone', refEventId: 'a' }),
      event({ id: 'c', type: 'redone', refEventId: 'a' }),
      event({ id: 'd', type: 'undone', refEventId: 'a' }),
    ]
    expect([...undoneEventIds(history.slice(0, 2))]).toEqual(['a'])
    expect([...undoneEventIds(history.slice(0, 3))]).toEqual([])
    expect([...undoneEventIds(history)]).toEqual(['a'])
  })
})
