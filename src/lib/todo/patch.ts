import type { Item, Series, TodoDocument } from '@/lib/validations/todo'

/** `[antes, depois]` de uma chave; `undefined` = a chave não existia (ou deixou de existir). */
export type Entry<T> = readonly [before: T | undefined, after: T | undefined]

/**
 * A diferença entre dois documentos nas partes que o desfazer reverte. Os cursores de geração ficam
 * de fora de propósito: desfazer nunca rebobina o "gerado até", senão uma ocorrência excluída
 * renasceria na próxima geração.
 */
export type Patch = {
  items: Record<string, Entry<Item>>
  series: Record<string, Entry<Series>>
  clearedDays: Record<string, Entry<true>>
}

function diffRecord<T>(prev: Record<string, T>, next: Record<string, T>): Record<string, Entry<T>> {
  const out: Record<string, Entry<T>> = {}
  if (prev === next) return out
  const nextKeys = new Set(Object.keys(next))
  for (const key of nextKeys) {
    if (prev[key] !== next[key]) out[key] = [prev[key], next[key]]
  }
  for (const key of Object.keys(prev)) {
    if (!nextKeys.has(key)) out[key] = [prev[key], undefined]
  }
  return out
}

function invertRecord<T>(record: Record<string, Entry<T>>): Record<string, Entry<T>> {
  const out: Record<string, Entry<T>> = {}
  for (const [key, [before, after]] of Object.entries(record)) out[key] = [after, before]
  return out
}

function applyRecord<T>(
  target: Record<string, T>,
  entries: Record<string, Entry<T>>
): Record<string, T> {
  const keys = Object.keys(entries)
  if (keys.length === 0) return target
  const next = { ...target }
  for (const key of keys) {
    const after = entries[key][1]
    if (after === undefined) delete next[key]
    else next[key] = after
  }
  return next
}

/** O que mudou entre `prev` e `next` em itens, séries e dias zerados. */
export function diffDocs(prev: TodoDocument, next: TodoDocument): Patch {
  return {
    items: diffRecord(prev.items, next.items),
    series: diffRecord(prev.series, next.series),
    clearedDays: diffRecord(prev.clearedDays, next.clearedDays),
  }
}

/** O patch que desfaz este. */
export function invertPatch(patch: Patch): Patch {
  return {
    items: invertRecord(patch.items),
    series: invertRecord(patch.series),
    clearedDays: invertRecord(patch.clearedDays),
  }
}

/** Aplica o lado "depois" de cada entrada. Preserva a referência do que o patch não toca. */
export function applyPatch(doc: TodoDocument, patch: Patch): TodoDocument {
  return {
    ...doc,
    items: applyRecord(doc.items, patch.items),
    series: applyRecord(doc.series, patch.series),
    clearedDays: applyRecord(doc.clearedDays, patch.clearedDays),
  }
}

/** `true` se o patch não muda nada. */
export function isEmptyPatch(patch: Patch): boolean {
  return (
    Object.keys(patch.items).length === 0 &&
    Object.keys(patch.series).length === 0 &&
    Object.keys(patch.clearedDays).length === 0
  )
}
