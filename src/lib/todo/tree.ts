import { TODO_MAX_DEPTH } from '@/constants/todo'
import { compareSiblings } from '@/lib/todo/order'
import type { Item } from '@/lib/validations/todo'

/** Os itens do documento, por id. */
export type Items = Record<string, Item>

/** Por que um movimento é recusado. */
export type MoveRefusal = 'not-found' | 'self' | 'cycle' | 'depth'

export type MoveCheck = { ok: true } | { ok: false; reason: MoveRefusal }

type ChildrenIndex = Map<string | null, string[]>

// Por quê: o índice de filhos é a base de quase tudo (linhas, progresso, descendentes). Reconstruí-lo
// a cada chamada seria O(n) por linha; como os reducers preservam a identidade de `items` quando
// nada muda, a memoização por referência vale para qualquer quantidade de leitores.
const indexCache = new WeakMap<Items, ChildrenIndex>()

/** Ids dos filhos de cada pai (`null` = raiz), já na ordem de exibição. Memoizado por referência. */
export function childrenIndex(items: Items): ChildrenIndex {
  const cached = indexCache.get(items)
  if (cached) return cached
  const index: ChildrenIndex = new Map()
  for (const item of Object.values(items)) {
    const list = index.get(item.parentId)
    if (list) list.push(item.id)
    else index.set(item.parentId, [item.id])
  }
  for (const list of index.values()) list.sort((a, b) => compareSiblings(items[a], items[b]))
  indexCache.set(items, index)
  return index
}

/** Ids dos filhos diretos, na ordem de exibição. */
export function childIds(items: Items, parentId: string | null): readonly string[] {
  return childrenIndex(items).get(parentId) ?? []
}

/** Os irmãos (filhos de `parentId`) como itens, na ordem de exibição. */
export function siblingsOf(items: Items, parentId: string | null): Item[] {
  return childIds(items, parentId).map((id) => items[id])
}

/** `true` se o item tem ao menos um filho. */
export function hasChildren(items: Items, id: string): boolean {
  return childIds(items, id).length > 0
}

/** Ancestrais do item, do pai mais próximo até a raiz. Tolera ciclos em dado corrompido. */
export function ancestorsOf(items: Items, id: string): string[] {
  const result: string[] = []
  const seen = new Set<string>([id])
  let current = items[id]?.parentId ?? null
  while (current !== null && !seen.has(current) && items[current]) {
    result.push(current)
    seen.add(current)
    current = items[current].parentId
  }
  return result
}

/** Descendentes do item em pré-ordem (cada pai antes dos seus filhos). */
export function descendantsOf(items: Items, id: string): string[] {
  const result: string[] = []
  const stack = [...childIds(items, id)].reverse()
  while (stack.length > 0) {
    const current = stack.pop() as string
    result.push(current)
    const children = childIds(items, current)
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i])
  }
  return result
}

/** Nível do item: 0 na raiz. */
export function depthOf(items: Items, id: string): number {
  return ancestorsOf(items, id).length
}

/** Quantos níveis existem abaixo do item (0 numa folha). */
export function subtreeHeight(items: Items, id: string): number {
  const seen = new Set<string>([id])
  let level: readonly string[] = [id]
  let height = -1
  while (level.length > 0) {
    height++
    const next: string[] = []
    for (const current of level) {
      for (const child of childIds(items, current)) {
        if (!seen.has(child)) {
          seen.add(child)
          next.push(child)
        }
      }
    }
    level = next
  }
  return height
}

/** `true` se mover `id` para dentro de `newParentId` o poria dentro de si mesmo. */
export function wouldCreateCycle(items: Items, id: string, newParentId: string | null): boolean {
  if (newParentId === null) return false
  return newParentId === id || ancestorsOf(items, newParentId).includes(id)
}

/** Confere se `id` pode ir para `newParentId`: existe, sem ciclo e dentro do limite de níveis. */
export function canMove(items: Items, id: string, newParentId: string | null): MoveCheck {
  if (!items[id] || (newParentId !== null && !items[newParentId])) {
    return { ok: false, reason: 'not-found' }
  }
  if (newParentId === id) return { ok: false, reason: 'self' }
  if (wouldCreateCycle(items, id, newParentId)) return { ok: false, reason: 'cycle' }
  const parentDepth = newParentId === null ? -1 : depthOf(items, newParentId)
  if (parentDepth + 1 + subtreeHeight(items, id) > TODO_MAX_DEPTH - 1) {
    return { ok: false, reason: 'depth' }
  }
  return { ok: true }
}
