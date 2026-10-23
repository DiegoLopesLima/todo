import { ONE_DAY_IN_MS } from '@/constants/time'
import {
  TODO_BACKUP_REMINDER_CHANGES,
  TODO_BACKUP_REMINDER_DAYS,
  TODO_EXPORT_APP_ID,
  TODO_EXPORT_SCHEMA_VERSION,
  TODO_IMPORT_MAX_BYTES,
  TODO_MAX_ITEMS,
} from '@/constants/todo'
import type { ImportMode } from '@/enums/todo'
import type { Ctx } from '@/lib/todo/ctx'
import { appendHistory } from '@/lib/todo/history'
import { repairDocument } from '@/lib/todo/integrity'
import {
  type ExportFile,
  exportFileSchema,
  type HistoryEvent,
  type TodoDocument,
} from '@/lib/validations/todo'

/** Por que um arquivo não pôde ser lido. A interface traduz o código. */
export type ImportErrorCode =
  | 'too-large'
  | 'invalid-json'
  | 'wrong-app'
  | 'unsupported-version'
  | 'invalid-data'

export type ImportError = {
  code: ImportErrorCode
  /** Onde, no arquivo, o primeiro problema de dados foi encontrado (ex.: `data.items.<id>.dueOn`). */
  path?: string
  detail?: string
}

/** O que uma importação faria, para a pessoa conferir antes de confirmar. */
export type ImportSummary = {
  itemsAdded: number
  itemsUpdated: number
  /** Itens que existem hoje e deixariam de existir (só em "substituir"). */
  itemsRemoved: number
  itemsTotal: number
  seriesAdded: number
  historyEvents: number
}

type Merged = Pick<TodoDocument, 'items' | 'series' | 'cursors' | 'clearedDays' | 'history'>

export type ImportPlan =
  | { ok: true; merged: Merged; summary: ImportSummary }
  | { ok: false; reason: 'limit' }

/** O conteúdo do documento no formato do arquivo de exportação. */
export function buildExport(doc: TodoDocument, ctx: Ctx): ExportFile {
  return {
    app: TODO_EXPORT_APP_ID,
    schemaVersion: TODO_EXPORT_SCHEMA_VERSION,
    exportedAt: ctx.now.toISOString(),
    data: {
      items: doc.items,
      series: doc.series,
      cursors: doc.cursors,
      clearedDays: doc.clearedDays,
      history: doc.history,
    },
  }
}

/** JSON legível do arquivo de exportação. */
export function serializeExport(file: ExportFile): string {
  return JSON.stringify(file, null, 2)
}

/**
 * Lê e valida o texto de um arquivo de importação. Nunca lança: devolve o erro com o caminho do
 * primeiro dado inválido, para a mensagem dizer o que está errado e onde.
 */
export function parseImportText(
  text: string
): { ok: true; file: ExportFile } | { ok: false; error: ImportError } {
  if (new TextEncoder().encode(text).length > TODO_IMPORT_MAX_BYTES) {
    return { ok: false, error: { code: 'too-large' } }
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      error: { code: 'invalid-json', detail: error instanceof Error ? error.message : undefined },
    }
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: { code: 'wrong-app' } }
  }
  const header = json as { app?: unknown; schemaVersion?: unknown }
  if (header.app !== TODO_EXPORT_APP_ID) return { ok: false, error: { code: 'wrong-app' } }
  if (
    typeof header.schemaVersion === 'number' &&
    header.schemaVersion > TODO_EXPORT_SCHEMA_VERSION
  ) {
    return { ok: false, error: { code: 'unsupported-version' } }
  }

  const parsed = exportFileSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      error: { code: 'invalid-data', path: issue.path.join('.'), detail: issue.message },
    }
  }
  return { ok: true, file: parsed.data }
}

function newerWins<T extends { updatedAt: string }>(
  current: Record<string, T>,
  incoming: Record<string, T>
): Record<string, T> {
  const next = { ...current }
  for (const [id, entry] of Object.entries(incoming)) {
    const existing = current[id]
    if (!existing || entry.updatedAt > existing.updatedAt) next[id] = entry
  }
  return next
}

function maxCursors(
  current: Record<string, string>,
  incoming: Record<string, string>
): Record<string, string> {
  const next = { ...current }
  for (const [id, day] of Object.entries(incoming)) {
    if (next[id] === undefined || day > next[id]) next[id] = day
  }
  return next
}

/** Junta dois históricos sem repetir eventos (pelo id), em ordem cronológica, já podado. */
export function mergeHistory(
  current: readonly HistoryEvent[],
  incoming: readonly HistoryEvent[],
  ctx: Ctx
): HistoryEvent[] {
  const byId = new Map<string, HistoryEvent>()
  for (const event of [...current, ...incoming]) if (!byId.has(event.id)) byId.set(event.id, event)
  const sorted = [...byId.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  return appendHistory([], sorted, ctx)
}

/**
 * Calcula o resultado de importar `file` em `doc`, sem aplicar. **Mesclar** acrescenta o que não
 * existe e, para um item dos dois lados, fica com o alterado mais recentemente; **substituir** troca
 * itens, séries e dias zerados pelos do arquivo. O histórico nunca se perde: os dois lados se unem.
 */
export function planImport(
  doc: TodoDocument,
  file: ExportFile,
  mode: ImportMode,
  ctx: Ctx
): ImportPlan {
  const { data } = file
  const merge = mode === 'merge'
  const candidate: TodoDocument = {
    ...doc,
    items: merge ? newerWins(doc.items, data.items) : data.items,
    series: merge ? newerWins(doc.series, data.series) : data.series,
    cursors: merge ? maxCursors(doc.cursors, data.cursors) : data.cursors,
    clearedDays: merge ? { ...doc.clearedDays, ...data.clearedDays } : data.clearedDays,
    history: mergeHistory(doc.history, data.history ?? [], ctx),
  }
  const repaired = repairDocument(candidate, ctx).doc
  if (Object.keys(repaired.items).length > TODO_MAX_ITEMS) return { ok: false, reason: 'limit' }

  let itemsAdded = 0
  let itemsUpdated = 0
  for (const [id, item] of Object.entries(repaired.items)) {
    const before = doc.items[id]
    if (!before) itemsAdded++
    else if (before !== item && before.updatedAt !== item.updatedAt) itemsUpdated++
  }
  const itemsRemoved = Object.keys(doc.items).filter((id) => !repaired.items[id]).length
  return {
    ok: true,
    merged: {
      items: repaired.items,
      series: repaired.series,
      cursors: repaired.cursors,
      clearedDays: repaired.clearedDays,
      history: repaired.history,
    },
    summary: {
      itemsAdded,
      itemsUpdated,
      itemsRemoved,
      itemsTotal: Object.keys(repaired.items).length,
      seriesAdded: Object.keys(repaired.series).filter((id) => !doc.series[id]).length,
      historyEvents: data.history?.length ?? 0,
    },
  }
}

/** Registra que a pessoa acabou de exportar: zera o contador de mudanças desde o último backup. */
export function markExported(doc: TodoDocument, ctx: Ctx): TodoDocument {
  return {
    ...doc,
    rev: doc.rev + 1,
    meta: { lastExportedAt: ctx.now.toISOString(), changesSinceExport: 0 },
  }
}

/**
 * Hora de lembrar do backup? Só depois de um bom número de mudanças desde a última exportação E de
 * alguns dias (ou se nunca exportou) — lembrar a cada alteração viraria ruído.
 */
export function shouldRemindBackup(meta: TodoDocument['meta'], ctx: Ctx): boolean {
  if (meta.changesSinceExport < TODO_BACKUP_REMINDER_CHANGES) return false
  if (meta.lastExportedAt === null) return true
  const days = (ctx.now.getTime() - new Date(meta.lastExportedAt).getTime()) / ONE_DAY_IN_MS
  return days >= TODO_BACKUP_REMINDER_DAYS
}
