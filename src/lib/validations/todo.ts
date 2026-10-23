import { z } from 'zod'

import {
  TODO_EXPORT_APP_ID,
  TODO_HISTORY_MAX_CHANGES,
  TODO_HISTORY_TEXT_LENGTH,
  TODO_MAX_INTERVAL,
  TODO_MAX_TEXT_LENGTH,
} from '@/constants/todo'
import {
  HISTORY_EVENT_TYPES,
  HISTORY_ORIGINS,
  PRIORITIES,
  RECURRENCE_FREQUENCIES,
} from '@/enums/todo'
import { isRealCalendarDate } from '@/lib/todo/dates'
import { ITEM_ID_PATTERN } from '@/lib/todo/ids'
import { requiredString } from '@/lib/validations/common'

const LAST_WEEKDAY = 6
const LAST_DAY_OF_MONTH = 31
const MAX_RANK_LENGTH = 128
const MAX_CHANGE_VALUE_LENGTH = 200

/** Dia do calendário local (`YYYY-MM-DD`); rejeita dias inexistentes como 31/02. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealCalendarDate)

/** Instante em ISO 8601 — só para auditoria, nunca para decidir o dia de um item. */
export const isoDateTimeSchema = z.iso.datetime()

/** Id de item ou série: UUID, opcionalmente seguido de `:data[:indice]` (ocorrência e seus filhos). */
export const itemIdSchema = z.string().regex(ITEM_ID_PATTERN)

export const prioritySchema = z.enum(PRIORITIES)

export const itemSchema = z
  .object({
    id: itemIdSchema,
    parentId: itemIdSchema.nullable(),
    text: z.string().trim().min(1).max(TODO_MAX_TEXT_LENGTH),
    priority: prioritySchema,
    rank: z.string().min(1).max(MAX_RANK_LENGTH),
    done: z.boolean(),
    completedAt: isoDateTimeSchema.nullable(),
    completedOn: dateKeySchema.nullable(),
    startsOn: dateKeySchema.nullable(),
    dueOn: dateKeySchema.nullable(),
    seriesId: itemIdSchema.nullable(),
    occurrenceOn: dateKeySchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((item) => item.startsOn === null || item.dueOn === null || item.startsOn <= item.dueOn, {
    message: 'startsOn must not be after dueOn',
    path: ['startsOn'],
  })
  .refine((item) => (item.seriesId === null) === (item.occurrenceOn === null), {
    message: 'seriesId and occurrenceOn must be set together',
    path: ['seriesId'],
  })
  .refine((item) => item.done === (item.completedAt !== null && item.completedOn !== null), {
    message: 'done must match completedAt/completedOn',
    path: ['done'],
  })

export const recurrenceSchema = z.discriminatedUnion('freq', [
  z.object({
    freq: z.literal(RECURRENCE_FREQUENCIES[0]),
    interval: z.int().min(1).max(TODO_MAX_INTERVAL.daily),
  }),
  z.object({
    freq: z.literal(RECURRENCE_FREQUENCIES[1]),
    interval: z.int().min(1).max(TODO_MAX_INTERVAL.weekly),
    weekdays: z
      .array(z.int().min(0).max(LAST_WEEKDAY))
      .min(1)
      .max(LAST_WEEKDAY + 1)
      .refine((days) => new Set(days).size === days.length),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  }),
  z.object({
    freq: z.literal(RECURRENCE_FREQUENCIES[2]),
    interval: z.int().min(1).max(TODO_MAX_INTERVAL.monthly),
    day: z.union([z.int().min(1).max(LAST_DAY_OF_MONTH), z.literal('last')]),
  }),
  z.object({
    freq: z.literal(RECURRENCE_FREQUENCIES[3]),
    interval: z.int().min(1).max(TODO_MAX_INTERVAL.yearly),
  }),
])

/** Molde de uma ocorrência: texto, prioridade e subitens copiados para cada dia gerado. */
export const blueprintSchema = z.object({
  text: z.string().trim().min(1).max(TODO_MAX_TEXT_LENGTH),
  priority: prioritySchema,
  get children() {
    return z.array(blueprintSchema)
  },
})

export const seriesSchema = z
  .object({
    id: itemIdSchema,
    rule: recurrenceSchema,
    startsOn: dateKeySchema,
    endsOn: dateKeySchema.nullable(),
    parentId: itemIdSchema.nullable(),
    blueprint: blueprintSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .refine((series) => series.endsOn === null || series.startsOn <= series.endsOn, {
    message: 'startsOn must not be after endsOn',
    path: ['endsOn'],
  })

const changeValueSchema = z.union([
  z.string().max(MAX_CHANGE_VALUE_LENGTH),
  z.number(),
  z.boolean(),
  z.null(),
])

export const historyEventSchema = z.object({
  id: z.string().min(1).max(MAX_RANK_LENGTH),
  at: isoDateTimeSchema,
  type: z.enum(HISTORY_EVENT_TYPES),
  itemId: itemIdSchema.nullable(),
  itemText: z.string().max(TODO_HISTORY_TEXT_LENGTH),
  seriesId: itemIdSchema.optional(),
  changes: z
    .array(z.object({ field: z.string().max(40), from: changeValueSchema, to: changeValueSchema }))
    .max(TODO_HISTORY_MAX_CHANGES)
    .optional(),
  count: z.int().min(0).optional(),
  origin: z.enum(HISTORY_ORIGINS),
  refEventId: z.string().max(MAX_RANK_LENGTH).optional(),
})

const itemsRecord = z.record(itemIdSchema, itemSchema)
const seriesRecord = z.record(itemIdSchema, seriesSchema)
const cursorsRecord = z.record(itemIdSchema, dateKeySchema)
const clearedDaysRecord = z.record(dateKeySchema, z.literal(true))

export const todoMetaSchema = z.object({
  lastExportedAt: isoDateTimeSchema.nullable(),
  changesSinceExport: z.int().min(0),
})

/** O documento inteiro que o app persiste. */
export const todoDocumentSchema = z.object({
  items: itemsRecord,
  series: seriesRecord,
  /** "Gerado até" por série; só avança e fica fora do desfazer. */
  cursors: cursorsRecord,
  /** Dias zerados — a base da sequência. */
  clearedDays: clearedDaysRecord,
  history: z.array(historyEventSchema),
  rev: z.int().min(0),
  meta: todoMetaSchema,
})

/** O arquivo JSON de exportação/importação. */
export const exportFileSchema = z.object({
  app: z.literal(TODO_EXPORT_APP_ID),
  schemaVersion: z.int().min(1),
  exportedAt: isoDateTimeSchema,
  data: z.object({
    items: itemsRecord,
    series: seriesRecord,
    cursors: cursorsRecord,
    clearedDays: clearedDaysRecord,
    history: z.array(historyEventSchema).optional(),
  }),
})

/**
 * Formulário de datas e repetição de um item. As mensagens de erro são chaves do namespace
 * `validation` (a tela as traduz). `freq: 'none'` = não repete.
 */
export const detailsFormSchema = z
  .object({
    startsOn: dateKeySchema.nullable(),
    dueOn: dateKeySchema.nullable(),
    freq: z.enum(['none', ...RECURRENCE_FREQUENCIES]),
    interval: z.number().int().min(1),
    weekdays: z.array(z.number().int().min(0).max(LAST_WEEKDAY)),
    monthDay: z.union([z.number().int().min(1).max(LAST_DAY_OF_MONTH), z.literal('last')]),
    endsOn: dateKeySchema.nullable(),
  })
  .refine((v) => v.startsOn === null || v.dueOn === null || v.startsOn <= v.dueOn, {
    message: 'dates_order',
    path: ['dueOn'],
  })
  .refine((v) => v.freq !== 'weekly' || v.weekdays.length > 0, {
    message: 'weekdays_required',
    path: ['weekdays'],
  })
  .refine((v) => v.freq === 'none' || v.interval <= TODO_MAX_INTERVAL[v.freq], {
    message: 'interval_range',
    path: ['interval'],
  })
  .refine((v) => v.endsOn === null || v.startsOn === null || v.startsOn <= v.endsOn, {
    message: 'dates_order',
    path: ['endsOn'],
  })

/** Formulário do campo de criação rápida. */
export const quickAddSchema = z.object({
  text: requiredString('required', TODO_MAX_TEXT_LENGTH),
})

export type Item = z.infer<typeof itemSchema>
export type Recurrence = z.infer<typeof recurrenceSchema>
export type Blueprint = z.infer<typeof blueprintSchema>
export type Series = z.infer<typeof seriesSchema>
export type HistoryEvent = z.infer<typeof historyEventSchema>
export type TodoDocument = z.infer<typeof todoDocumentSchema>
export type ExportFile = z.infer<typeof exportFileSchema>
export type QuickAddValues = z.infer<typeof quickAddSchema>
export type DetailsFormValues = z.infer<typeof detailsFormSchema>
