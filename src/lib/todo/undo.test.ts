import { TODO_UNDO_LIMIT } from '@/constants/todo'
import { type Command, type RunResult, runCommand, runMaterialize } from '@/lib/todo/commands'
import { undoneEventIds } from '@/lib/todo/history'
import {
  EMPTY_STACKS,
  pushUndo,
  redoStep,
  toUndoEntry,
  type UndoStacks,
  undoStep,
} from '@/lib/todo/undo'
import type { TodoDocument } from '@/lib/validations/todo'
import { emptyDoc, testCtx } from '@/test/todo-fixtures'

const ctx = testCtx('2026-03-10')

/** A parte do documento que o desfazer reverte. */
const core = (doc: TodoDocument) => ({
  items: doc.items,
  series: doc.series,
  clearedDays: doc.clearedDays,
})

function must(result: RunResult): Extract<RunResult, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
  return result
}

type Step = (doc: TodoDocument) => Command
const ids = (doc: TodoDocument) => Object.keys(doc.items)
const byText = (doc: TodoDocument, text: string) =>
  Object.values(doc.items).find((item) => item.text === text)?.id as string

/** Aplica os comandos empilhando o desfazer; devolve o estado final, as pilhas e os instantâneos. */
function play(steps: Step[]) {
  let doc = emptyDoc()
  let stacks: UndoStacks = EMPTY_STACKS
  const snapshots = [core(doc)]
  for (const step of steps) {
    const result = must(runCommand(doc, step(doc), ctx))
    stacks = pushUndo(stacks, toUndoEntry(result))
    doc = result.doc
    snapshots.push(core(doc))
  }
  return { doc, stacks, snapshots }
}

const script: Step[] = [
  () => ({ type: 'createItem', text: 'A', parentId: null }),
  (doc) => ({ type: 'createItem', text: 'B', parentId: byText(doc, 'A') }),
  (doc) => ({ type: 'createItem', text: 'C', parentId: byText(doc, 'A') }),
  () => ({ type: 'createItem', text: 'D', parentId: null, priority: 'p2' }),
  (doc) => ({ type: 'toggleDone', id: byText(doc, 'B'), done: true }),
  (doc) => ({ type: 'toggleDone', id: byText(doc, 'A'), done: true }),
  (doc) => ({ type: 'toggleDone', id: byText(doc, 'C'), done: false }),
  (doc) => ({ type: 'editItem', id: byText(doc, 'D'), patch: { text: 'D2', dueOn: '2026-03-12' } }),
  (doc) => ({
    type: 'moveItem',
    id: byText(doc, 'D2'),
    parentId: byText(doc, 'C'),
    priority: 'p1',
    rank: 'a0',
  }),
  () => ({
    type: 'createSeries',
    text: 'Code review',
    parentId: null,
    rule: { freq: 'daily', interval: 1 },
    startsOn: '2026-03-08',
  }),
  (doc) => ({ type: 'toggleDone', id: byText(doc, 'Code review'), done: true }),
  () => ({ type: 'dismissOverdue' }),
  (doc) => ({ type: 'deleteItem', id: byText(doc, 'A') }),
]

describe('desfazer e refazer', () => {
  it('desfazer volta cada passo ao estado anterior, na ordem inversa', () => {
    const { doc: finalDoc, stacks, snapshots } = play(script)
    let doc = finalDoc
    let current = stacks
    for (let step = script.length; step >= 1; step--) {
      const result = undoStep(doc, current, ctx)
      if (!result) throw new Error('nada a desfazer')
      doc = result.doc
      current = result.stacks
      expect(core(doc)).toEqual(snapshots[step - 1])
    }
    expect(ids(doc)).toEqual([])
    expect(undoStep(doc, current, ctx)).toBeNull()
  })

  it('refazer reaplica cada passo até o estado final', () => {
    const { doc: finalDoc, stacks, snapshots } = play(script)
    let doc = finalDoc
    let current = stacks
    for (let i = 0; i < script.length; i++) {
      const result = undoStep(doc, current, ctx)
      if (!result) throw new Error('nada a desfazer')
      doc = result.doc
      current = result.stacks
    }
    for (let step = 1; step <= script.length; step++) {
      const result = redoStep(doc, current, ctx)
      if (!result) throw new Error('nada a refazer')
      doc = result.doc
      current = result.stacks
      expect(core(doc)).toEqual(snapshots[step])
    }
    expect(redoStep(doc, current, ctx)).toBeNull()
  })

  it('um passo novo limpa o "refazer"', () => {
    const { doc, stacks } = play(script.slice(0, 2))
    const undone = undoStep(doc, stacks, ctx)
    if (!undone) throw new Error('nada a desfazer')
    expect(undone.stacks.redo).toHaveLength(1)
    const result = must(
      runCommand(undone.doc, { type: 'createItem', text: 'outro', parentId: null }, ctx)
    )
    expect(pushUndo(undone.stacks, toUndoEntry(result)).redo).toEqual([])
  })

  it('guarda no máximo o limite de passos, descartando os mais antigos', () => {
    let stacks: UndoStacks = EMPTY_STACKS
    const entry = {
      patch: { items: {}, series: {}, clearedDays: {} },
      label: 'createItem' as const,
      eventIds: [],
    }
    for (let i = 0; i < TODO_UNDO_LIMIT + 5; i++) {
      stacks = pushUndo(stacks, { ...entry, eventIds: [String(i)] })
    }
    expect(stacks.undo).toHaveLength(TODO_UNDO_LIMIT)
    expect(stacks.undo[0].eventIds).toEqual(['5'])
  })

  it('sem passos, desfazer e refazer devolvem null', () => {
    expect(undoStep(emptyDoc(), EMPTY_STACKS, ctx)).toBeNull()
    expect(redoStep(emptyDoc(), EMPTY_STACKS, ctx)).toBeNull()
  })

  describe('histórico', () => {
    it('desfazer não apaga o registro original: acrescenta "desfeito" e marca o original', () => {
      const { doc, stacks } = play(script.slice(0, 1))
      const original = doc.history[0]
      const undone = undoStep(doc, stacks, ctx)
      if (!undone) throw new Error('nada a desfazer')

      expect(undone.doc.history).toHaveLength(2)
      expect(undone.doc.history[0]).toEqual(original)
      expect(undone.doc.history[1]).toMatchObject({
        type: 'undone',
        refEventId: original.id,
        itemText: 'A',
      })
      expect(undoneEventIds(undone.doc.history).has(original.id)).toBe(true)

      const redone = redoStep(undone.doc, undone.stacks, ctx)
      if (!redone) throw new Error('nada a refazer')
      expect(redone.doc.history.at(-1)).toMatchObject({ type: 'redone', refEventId: original.id })
      expect(undoneEventIds(redone.doc.history).has(original.id)).toBe(false)
    })

    it('se os eventos originais foram podados, o desfazer ainda é registrado', () => {
      const { doc, stacks } = play(script.slice(0, 1))
      const pruned = { ...doc, history: [] }
      const undone = undoStep(pruned, stacks, ctx)
      expect(undone?.doc.history).toEqual([
        expect.objectContaining({ type: 'undone', itemId: null }),
      ])
    })

    it('desfazer e refazer contam como alteração (backup) e sobem a revisão', () => {
      const { doc, stacks } = play(script.slice(0, 1))
      const undone = undoStep(doc, stacks, ctx)
      expect(undone?.doc.rev).toBe(doc.rev + 1)
      expect(undone?.doc.meta.changesSinceExport).toBe(doc.meta.changesSinceExport + 1)
    })
  })

  describe('interação com a geração de ocorrências', () => {
    it('desfazer não rebobina o cursor: o dia já gerado não é gerado de novo', () => {
      const { doc, stacks } = play(script.slice(9, 10))
      const [seriesId] = Object.keys(doc.series)
      const cursor = doc.cursors[seriesId]
      const undone = undoStep(doc, stacks, ctx)
      expect(undone?.doc.cursors[seriesId]).toBe(cursor)
    })

    it('refazer a conclusão de um pai que ganhou um filho aberto nesse meio-tempo não o deixa concluído', () => {
      // A conclui → uma série com pai A gera uma ocorrência aberta (A reabre) → desfazer e refazer
      // a conclusão de A não pode deixar A concluído com um filho aberto.
      const { doc, stacks } = play([
        () => ({ type: 'createItem', text: 'A', parentId: null }),
        (d) => ({ type: 'toggleDone', id: byText(d, 'A'), done: true }),
      ])
      const aId = byText(doc, 'A')
      const withSeries = {
        ...doc,
        series: {
          s: {
            id: '00000000-0000-4000-8000-000000000500',
            rule: { freq: 'daily' as const, interval: 1 },
            startsOn: '2026-03-10',
            endsOn: null,
            parentId: aId,
            blueprint: { text: 'Filho', priority: 'p4' as const, children: [] },
            createdAt: '2026-03-01T12:00:00.000Z',
            updatedAt: '2026-03-01T12:00:00.000Z',
          },
        },
      }
      const materialized = runMaterialize(withSeries, ctx).doc
      expect(materialized.items[aId].done).toBe(false)
      const undone = undoStep(materialized, stacks, ctx)
      if (!undone) throw new Error('nada a desfazer')
      const redone = redoStep(undone.doc, undone.stacks, ctx)
      expect(redone?.doc.items[aId].done).toBe(false)
    })
  })
})
