import { type Ctx, isoNow } from '@/lib/todo/ctx'
import { ancestorsOf, childIds, childrenIndex, descendantsOf, type Items } from '@/lib/todo/tree'
import type { Item } from '@/lib/validations/todo'

/** Resultado de mudar a conclusão de um item. */
export type SetDoneResult = {
  items: Items
  /** Ids cujo estado de conclusão mudou (o alvo, descendentes e ancestrais). */
  changedIds: string[]
  /** Pais (itens com filhos) que passaram de abertos a concluídos — alimenta a celebração. */
  completedParents: string[]
}

/** Estado visual do checkbox. */
export type CheckState = 'unchecked' | 'checked' | 'indeterminate'

/** Folhas concluídas e totais sob um item (uma folha conta a si mesma). */
export type Progress = { done: number; total: number }

function withDone(item: Item, done: boolean, ctx: Ctx): Item {
  return {
    ...item,
    done,
    completedAt: done ? isoNow(ctx) : null,
    completedOn: done ? ctx.today : null,
    updatedAt: isoNow(ctx),
  }
}

/**
 * Restaura o invariante "pai com filhos está concluído ⇔ todos os filhos estão" para os ancestrais
 * dos `startIds`, de baixo para cima. Um pai sem filhos mantém o próprio estado. Preserva a
 * identidade dos itens que não mudam.
 */
export function reconcileFrom(
  items: Items,
  startIds: readonly string[],
  ctx: Ctx
): { items: Items; changedIds: string[] } {
  const next: Items = { ...items }
  const changedIds: string[] = []
  const pending = new Set<string>()
  for (const id of startIds) {
    if (items[id]) pending.add(id)
    for (const ancestor of ancestorsOf(items, id)) pending.add(ancestor)
  }
  const index = childrenIndex(items)
  // Mais fundo primeiro: o estado de um pai depende do estado já corrigido dos filhos.
  const ordered = [...pending].sort(
    (a, b) => ancestorsOf(items, b).length - ancestorsOf(items, a).length
  )
  for (const id of ordered) {
    const children = index.get(id)
    if (!children || children.length === 0) continue
    const shouldBeDone = children.every((childId) => next[childId].done)
    if (next[id].done !== shouldBeDone) {
      next[id] = withDone(next[id], shouldBeDone, ctx)
      changedIds.push(id)
    }
  }
  return changedIds.length === 0 ? { items, changedIds } : { items: next, changedIds }
}

/**
 * Marca ou desmarca um item. Propaga para todos os descendentes e corrige os ancestrais (o pai
 * conclui quando o último filho conclui e reabre quando qualquer filho reabre).
 */
export function setDone(items: Items, id: string, done: boolean, ctx: Ctx): SetDoneResult {
  if (!items[id]) return { items, changedIds: [], completedParents: [] }

  const next: Items = { ...items }
  const changedIds: string[] = []
  for (const targetId of [id, ...descendantsOf(items, id)]) {
    if (next[targetId].done !== done) {
      next[targetId] = withDone(next[targetId], done, ctx)
      changedIds.push(targetId)
    }
  }

  const reconciled = reconcileFrom(next, [id], ctx)
  changedIds.push(...reconciled.changedIds.filter((changed) => !changedIds.includes(changed)))

  const completedParents = done
    ? changedIds.filter(
        (changed) => !items[changed].done && childIds(reconciled.items, changed).length > 0
      )
    : []

  if (changedIds.length === 0) return { items, changedIds, completedParents }
  return { items: reconciled.items, changedIds, completedParents }
}

const progressCache = new WeakMap<Items, Map<string, Progress>>()

/** Progresso (folhas concluídas / folhas totais) de cada item. Memoizado por referência. */
export function progressOf(items: Items): Map<string, Progress> {
  const cached = progressCache.get(items)
  if (cached) return cached
  const result = new Map<string, Progress>()
  const index = childrenIndex(items)

  const visit = (id: string, seen: Set<string>): Progress => {
    const known = result.get(id)
    if (known) return known
    const children = index.get(id) ?? []
    let progress: Progress
    if (children.length === 0 || seen.has(id)) {
      progress = { done: items[id].done ? 1 : 0, total: 1 }
    } else {
      seen.add(id)
      progress = { done: 0, total: 0 }
      for (const child of children) {
        const childProgress = visit(child, seen)
        progress.done += childProgress.done
        progress.total += childProgress.total
      }
      seen.delete(id)
    }
    result.set(id, progress)
    return progress
  }

  for (const id of Object.keys(items)) visit(id, new Set())
  progressCache.set(items, result)
  return result
}

/** Estado do checkbox a partir do progresso: parcial vira indeterminado. */
export function checkState(progress: Progress): CheckState {
  if (progress.total > 0 && progress.done === progress.total) return 'checked'
  if (progress.done === 0) return 'unchecked'
  return 'indeterminate'
}
