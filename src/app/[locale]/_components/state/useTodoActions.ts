'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { TODO_MAX_ITEMS, TODO_MAX_TEXT_LENGTH, TODO_SINK_DELAY_MS } from '@/constants/todo'
import type { Priority } from '@/enums/todo'
import type { Command, CommandType, RunResult } from '@/lib/todo/commands'
import type { DateKey } from '@/lib/todo/dates'
import {
  type MovePlan,
  planIndent,
  planMoveTo,
  planOutdent,
  planSiblingMove,
} from '@/lib/todo/move-plans'
import { computeStreak } from '@/lib/todo/stats'
import type { Recurrence } from '@/lib/validations/todo'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'

type Translator = (key: string, values?: Record<string, string | number>) => string
type ItemPatch = Extract<Command, { type: 'editItem' }>['patch']

function nonNull<T>(value: T | null): value is T {
  return value !== null
}

/** O que cada ação da interface faz — todas passam por `dispatch` e dão o feedback devido. */
export type TodoActions = ReturnType<typeof buildActions>

function buildActions(t: Translator) {
  const doc = () => useTodoDocument.getState().doc
  const ui = () => useTodoUi.getState()

  function celebrate(result: Extract<RunResult, { ok: true }>): void {
    if (result.celebrate === 'parent') {
      ui().celebrate('parent', result.events[0]?.itemId ?? null)
    } else if (result.celebrate === 'day') {
      const prefs = useTodoPrefs.getState()
      const { today } = ui()
      // Por quê: uma vez por dia — reabrir e zerar de novo não repete a festa.
      if (prefs.celebratedDay === today) return
      prefs.markDayCelebrated(today)
      ui().celebrate('day', null)
      toast.success(
        t('celebration.day', { count: computeStreak(doc().clearedDays, today).current })
      )
    }
  }

  /** Executa o comando e dá o feedback: erro, celebração. */
  function run(command: Command): RunResult {
    const result = useTodoDocument.getState().dispatch(command)
    if (!result.ok) {
      if (result.reason !== 'no-change') {
        const max = result.reason === 'limit' ? TODO_MAX_ITEMS : TODO_MAX_TEXT_LENGTH
        toast.error(t(`errors.${result.reason}`, { max }))
      }
      return result
    }
    celebrate(result)
    return result
  }

  /** Segura os itens recém-concluídos no lugar por um instante, antes de afundarem. */
  function holdBriefly(ids: readonly string[]): void {
    ui().holdOpen(ids, Date.now() + TODO_SINK_DELAY_MS)
    setTimeout(() => useTodoUi.getState().releaseHold(ids), TODO_SINK_DELAY_MS)
  }

  const actionLabel = (label: CommandType) => t(`undo.actions.${label}`)

  function toggle(id: string): void {
    const item = doc().items[id]
    if (!item) return
    const done = !item.done
    const result = run({ type: 'toggleDone', id, done })
    if (!result.ok) return
    ui().announce(t(done ? 'a11y.completed' : 'a11y.reopened', { text: item.text }))
    if (done) holdBriefly(result.events.map((event) => event.itemId).filter(nonNull))
  }

  function create(
    text: string,
    options: {
      parentId: string | null
      priority?: Priority
      startsOn?: DateKey | null
      dueOn?: DateKey | null
    } = { parentId: null }
  ): boolean {
    return run({ type: 'createItem', text, ...options }).ok
  }

  /** Cria uma tarefa que se repete (a série e já as ocorrências devidas até hoje). */
  function createRecurring(
    text: string,
    options: {
      parentId: string | null
      priority?: Priority
      rule: Recurrence
      startsOn: DateKey
      endsOn?: DateKey | null
    }
  ): boolean {
    return run({ type: 'createSeries', text, ...options }).ok
  }

  function edit(id: string, patch: ItemPatch): boolean {
    return run({ type: 'editItem', id, patch }).ok
  }

  function setPriority(id: string, priority: Priority): void {
    const item = doc().items[id]
    if (!item || item.priority === priority) return
    if (run({ type: 'editItem', id, patch: { priority } }).ok) {
      ui().announce(
        t('a11y.priorityChanged', { text: item.text, priority: t(`priority.${priority}`) })
      )
    }
  }

  function undo(): void {
    const entry = useTodoDocument.getState().undo()
    toast(entry ? t('undo.undone', { action: actionLabel(entry.label) }) : t('undo.nothing'))
  }

  function redo(): void {
    const entry = useTodoDocument.getState().redo()
    if (entry) toast(t('undo.redone', { action: actionLabel(entry.label) }))
  }

  function remove(id: string): void {
    const item = doc().items[id]
    if (!item || !run({ type: 'deleteItem', id }).ok) return
    ui().announce(t('a11y.deleted', { text: item.text }))
    toast(t('undo.deleted', { text: item.text }), {
      action: { label: t('undo.undo'), onClick: undo },
    })
  }

  function move(id: string, plan: MovePlan | null): boolean {
    if (!plan) return false
    const item = doc().items[id]
    const result = run({ type: 'moveItem', id, ...plan })
    if (result.ok && item) {
      ui().announce(
        item.priority === plan.priority
          ? t('a11y.moved', { text: item.text })
          : t('a11y.priorityChanged', { text: item.text, priority: t(`priority.${plan.priority}`) })
      )
    }
    return result.ok
  }

  return {
    run,
    toggle,
    create,
    createRecurring,
    edit,
    setPriority,
    remove,
    move,
    undo,
    redo,
    moveUp: (id: string) => move(id, planSiblingMove(doc().items, id, 'up')),
    moveDown: (id: string) => move(id, planSiblingMove(doc().items, id, 'down')),
    indent: (id: string) => move(id, planIndent(doc().items, id)),
    outdent: (id: string) => move(id, planOutdent(doc().items, id)),
    moveTo: (id: string, parentId: string | null) =>
      move(id, planMoveTo(doc().items, id, parentId)),
    toggleCollapsed: (id: string) => useTodoPrefs.getState().toggleCollapsed(id),
  }
}

/**
 * As ações da interface sobre o documento. Cada uma só lê o estado na hora de executar
 * (`getState()`), então o objeto é estável entre renders e passar uma ação como prop não re-renderiza
 * ninguém à toa — só muda se o idioma mudar.
 */
export function useTodoActions(): TodoActions {
  const t = useTranslations('todo') as Translator
  return useMemo(() => buildActions(t), [t])
}
