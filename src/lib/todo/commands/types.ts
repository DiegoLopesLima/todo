import type { ImportMode, Priority } from '@/enums/todo'
import type { DateKey } from '@/lib/todo/dates'
import type { EventDraft } from '@/lib/todo/history'
import type { Patch } from '@/lib/todo/patch'
import type { Items } from '@/lib/todo/tree'
import type {
  Blueprint,
  ExportFile,
  HistoryEvent,
  Recurrence,
  Series,
  TodoDocument,
} from '@/lib/validations/todo'

/** Campos de um item que a edição comum altera. `null` limpa uma data. */
export type ItemPatch = {
  text?: string
  priority?: Priority
  startsOn?: DateKey | null
  dueOn?: DateKey | null
}

/** Campos de uma série que a edição altera. */
export type SeriesPatch = {
  text?: string
  priority?: Priority
  rule?: Recurrence
  endsOn?: DateKey | null
  parentId?: string | null
}

/**
 * Tudo o que muda o documento por vontade da pessoa. É a única porta de entrada para mutações:
 * a store só faz `dispatch(command)`, e cada passo vira uma entrada de desfazer.
 */
export type Command =
  | {
      type: 'createItem'
      text: string
      parentId: string | null
      priority?: Priority
      startsOn?: DateKey | null
      dueOn?: DateKey | null
    }
  | { type: 'editItem'; id: string; patch: ItemPatch }
  | { type: 'toggleDone'; id: string; done: boolean }
  | { type: 'moveItem'; id: string; parentId: string | null; priority: Priority; rank: string }
  | { type: 'deleteItem'; id: string }
  | {
      type: 'createSeries'
      text: string
      parentId: string | null
      priority?: Priority
      rule: Recurrence
      startsOn: DateKey
      endsOn?: DateKey | null
      children?: Blueprint[]
    }
  | {
      type: 'makeRecurring'
      id: string
      rule: Recurrence
      startsOn: DateKey
      endsOn?: DateKey | null
    }
  | { type: 'editSeries'; id: string; patch: SeriesPatch; fromDate?: DateKey }
  | { type: 'applyStructureToSeries'; itemId: string }
  | { type: 'endSeries'; id: string }
  | { type: 'deleteSeries'; id: string; deleteDone: boolean }
  | { type: 'dismissOverdue'; olderThanDays?: number }
  | { type: 'sortByDue'; parentId: string | null }
  | { type: 'clearCompleted'; olderThanDays: number }
  | { type: 'importDocument'; mode: ImportMode; file: ExportFile }

export type CommandType = Command['type']

/** Por que um comando foi recusado (a interface traduz). */
export type CommandError =
  | 'not-found'
  | 'empty-text'
  | 'text-too-long'
  | 'limit'
  | 'depth'
  | 'cycle'
  | 'self'
  | 'invalid-dates'
  | 'invalid-rule'
  | 'invalid-target'
  | 'no-change'
  /** O documento ainda não foi carregado do armazenamento. */
  | 'not-ready'

/** Celebração que o comando merece: um pai concluído ou o dia zerado. */
export type Celebration = 'parent' | 'day'

/** O que cada implementação de comando devolve, antes do commit. */
export type Outcome =
  | {
      ok: true
      items?: Items
      series?: Record<string, Series>
      cursors?: Record<string, string>
      clearedDays?: Record<string, true>
      history?: HistoryEvent[]
      events: EventDraft[]
      completedParents?: string[]
    }
  | { ok: false; reason: CommandError }

export type RunResult =
  | {
      ok: true
      doc: TodoDocument
      /** Diferença que o desfazer reverte. */
      patch: Patch
      /** Eventos acrescentados ao histórico. */
      events: HistoryEvent[]
      label: CommandType
      celebrate: Celebration | null
    }
  | { ok: false; reason: CommandError }
