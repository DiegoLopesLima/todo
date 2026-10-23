import type { Priority } from '@/enums/todo'
import { rankAtEndOfBand, rankForDrop, resolveDropPriority } from '@/lib/todo/order'
import { canMove, type Items, siblingsOf } from '@/lib/todo/tree'

/** Para onde um movimento por teclado ou menu leva um item. É o que vira o comando `moveItem`. */
export type MovePlan = { parentId: string | null; priority: Priority; rank: string }

/**
 * Sobe ou desce o item uma posição entre os irmãos abertos. Cruzar a fronteira de uma faixa de
 * prioridade muda a prioridade — a mesma regra do arrasto, então teclado e mouse nunca divergem.
 * `null` quando já está no limite.
 */
export function planSiblingMove(
  items: Items,
  id: string,
  direction: 'up' | 'down'
): MovePlan | null {
  const item = items[id]
  if (!item || item.done) return null
  const list = siblingsOf(items, item.parentId).filter((sibling) => !sibling.done)
  const index = list.findIndex((sibling) => sibling.id === id)
  if (index === -1) return null

  if (direction === 'up') {
    if (index === 0) return null
    const below = list[index - 1]
    const above = list[index - 2]
    const priority = resolveDropPriority(above, below, 'below', item.priority)
    return { parentId: item.parentId, priority, rank: rankForDrop(above, below, priority) }
  }

  if (index === list.length - 1) return null
  const above = list[index + 1]
  const below = list[index + 2]
  const priority = resolveDropPriority(above, below, 'above', item.priority)
  return { parentId: item.parentId, priority, rank: rankForDrop(above, below, priority) }
}

/** Leva o item para o fim da faixa dele sob `parentId`, mantendo a prioridade. */
function moveToEnd(items: Items, id: string, parentId: string | null): MovePlan | null {
  const item = items[id]
  if (!item || !canMove(items, id, parentId).ok) return null
  const siblings = siblingsOf(items, parentId).filter((sibling) => sibling.id !== id)
  return {
    parentId,
    priority: item.priority,
    rank: rankAtEndOfBand(siblings, item.priority),
  }
}

/** Indenta: o item vira o último filho do irmão de cima. `null` se não há irmão acima ou não cabe. */
export function planIndent(items: Items, id: string): MovePlan | null {
  const item = items[id]
  if (!item) return null
  const list = siblingsOf(items, item.parentId)
  const index = list.findIndex((sibling) => sibling.id === id)
  if (index <= 0) return null
  return moveToEnd(items, id, list[index - 1].id)
}

/** Desindenta: o item sobe um nível, para o pai do pai. `null` se já está na raiz. */
export function planOutdent(items: Items, id: string): MovePlan | null {
  const item = items[id]
  if (!item || item.parentId === null) return null
  return moveToEnd(items, id, items[item.parentId]?.parentId ?? null)
}

/** "Mover para…": o item vai para o fim da faixa dele sob o pai escolhido (`null` = raiz). */
export function planMoveTo(items: Items, id: string, parentId: string | null): MovePlan | null {
  const item = items[id]
  if (!item || item.parentId === parentId) return null
  return moveToEnd(items, id, parentId)
}
