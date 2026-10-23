/** Prioridade de um item; `p1` é a mais urgente e `p4` (padrão) a sem destaque. */
export const PRIORITIES = ['p1', 'p2', 'p3', 'p4'] as const
export type Priority = (typeof PRIORITIES)[number]

/** Visões da lista principal: o que aparece agora, o que está agendado e tudo. */
export const TODO_VIEWS = ['today', 'upcoming', 'all'] as const
export type TodoView = (typeof TODO_VIEWS)[number]

/** Frequências de recorrência suportadas. */
export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number]

/** Tipos de evento do histórico de alterações. */
export const HISTORY_EVENT_TYPES = [
  'created',
  'edited',
  'completed',
  'reopened',
  'moved',
  'reordered',
  'deleted',
  'imported',
  'occurrence_created',
  'occurrences_skipped',
  'occurrences_dismissed',
  'series_created',
  'series_changed',
  'series_ended',
  'undone',
  'redone',
] as const
export type HistoryEventType = (typeof HISTORY_EVENT_TYPES)[number]

/** Quem originou um evento: a pessoa, ou o próprio app (ex.: geração de ocorrências). */
export const HISTORY_ORIGINS = ['user', 'system'] as const
export type HistoryOrigin = (typeof HISTORY_ORIGINS)[number]

/** Como uma importação combina o arquivo com os dados atuais. */
export const IMPORT_MODES = ['merge', 'replace'] as const
export type ImportMode = (typeof IMPORT_MODES)[number]

/** Alcance de uma edição ou exclusão num item que veio de uma série recorrente. */
export const SERIES_SCOPES = ['this', 'future', 'series'] as const
export type SeriesScope = (typeof SERIES_SCOPES)[number]
