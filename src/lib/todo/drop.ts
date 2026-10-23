import type { Priority } from '@/enums/todo'
import { rankForDrop, resolveDropPriority } from '@/lib/todo/order'
import { canMove, type Items, type MoveRefusal, siblingsOf } from '@/lib/todo/tree'
import type { Item } from '@/lib/validations/todo'

export type DropRow = { id: string; depth: number }

export type DropInput = {
  items: Items
  /** Linhas visíveis na ordem atual, SEM os descendentes do item arrastado (eles vão junto). */
  rows: readonly DropRow[]
  activeId: string
  /** Linha sobre a qual o ponteiro está. */
  overId: string
  /** Deslocamento horizontal do ponteiro desde o início do arrasto, em px. */
  deltaX: number
  indentPx: number
  /** O ponteiro está mais perto do vizinho de cima ou do de baixo da fronteira de soltura. */
  nearer: 'above' | 'below'
}

export type DropTarget = {
  parentId: string | null
  priority: Priority
  rank: string
  depth: number
}

export type DropResult = { ok: true; target: DropTarget } | { ok: false; reason: MoveRefusal }

function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Resolve onde um item arrastado vai cair: o pai, a prioridade que ele adota e o rank.
 *
 * O nível vem do deslocamento horizontal (puxar para a direita aninha, para a esquerda sobe), limitado
 * pelo que a árvore permite naquele ponto. A prioridade e o rank só olham os vizinhos abertos da
 * mesma faixa — ver `rankForDrop`. É função pura: o adaptador de drag só traduz eventos nela.
 */
export function resolveDrop(input: DropInput): DropResult {
  const { items, rows, activeId, overId, deltaX, indentPx, nearer } = input
  const activeIndex = rows.findIndex((row) => row.id === activeId)
  const overIndex = rows.findIndex((row) => row.id === overId)
  const active = items[activeId]
  if (activeIndex === -1 || overIndex === -1 || !active) return { ok: false, reason: 'not-found' }

  const moved = arrayMove(rows, activeIndex, overIndex)
  const previous = moved[overIndex - 1]
  const next = moved[overIndex + 1]

  const projected = rows[activeIndex].depth + Math.round(deltaX / indentPx)
  const maxDepth = previous ? previous.depth + 1 : 0
  const minDepth = next ? next.depth : 0
  const depth = Math.max(minDepth, Math.min(maxDepth, projected))

  const parentId = parentAt(items, moved, overIndex, depth)
  const check = canMove(items, activeId, parentId)
  if (!check.ok) return { ok: false, reason: check.reason }

  let above = neighbor(items, moved, overIndex, depth, -1)
  let below = neighbor(items, moved, overIndex, depth, 1)
  // Concluídos ficam no fim do grupo: soltar depois de um deles é soltar no fim dos abertos.
  if (above?.done) {
    above = siblingsOf(items, parentId)
      .filter((s) => !s.done && s.id !== activeId)
      .at(-1)
    below = undefined
  }
  if (below?.done) below = undefined

  // Por quê: quem já divide a prioridade com um dos vizinhos continua na própria faixa — só cruzar
  // para uma faixa diferente muda a prioridade. Sem isto, apenas indentar um item na fronteira de
  // duas faixas o faria trocar de prioridade.
  const keepsBand = above?.priority === active.priority || below?.priority === active.priority
  const priority = keepsBand
    ? active.priority
    : resolveDropPriority(above, below, nearer, active.priority)
  return {
    ok: true,
    target: { parentId, priority, rank: rankForDrop(above, below, priority), depth },
  }
}

/** O pai de um item posto em `index` do nível `depth`, como na árvore de arrastar do dnd-kit. */
function parentAt(
  items: Items,
  moved: readonly DropRow[],
  index: number,
  depth: number
): string | null {
  if (depth === 0) return null
  const previous = moved[index - 1]
  if (previous && depth === previous.depth) return items[previous.id].parentId
  if (previous && depth > previous.depth) return previous.id
  for (let i = index - 1; i >= 0; i--) {
    if (moved[i].depth === depth) return items[moved[i].id].parentId
  }
  return null
}

/** O irmão mais próximo, para cima (`-1`) ou para baixo (`1`), no mesmo nível da soltura. */
function neighbor(
  items: Items,
  moved: readonly DropRow[],
  index: number,
  depth: number,
  step: -1 | 1
): Item | undefined {
  for (let i = index + step; i >= 0 && i < moved.length; i += step) {
    if (moved[i].depth === depth) return items[moved[i].id]
    if (moved[i].depth < depth) return undefined
  }
  return undefined
}
