import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

import { TODO_PRIORITY_WEIGHT } from '@/constants/todo'
import type { Priority } from '@/enums/todo'
import type { Item } from '@/lib/validations/todo'

/** Rank acima deste tamanho dispara o rebalanceamento da faixa (chaves crescem a cada inserção no mesmo ponto). */
export const MAX_RANK_LENGTH_BEFORE_REBALANCE = 64

/**
 * Ordem dos irmãos: abertos antes de concluídos, depois prioridade (`p1` primeiro) e por fim o
 * rank manual — que só compara itens da mesma faixa de prioridade. O id desempata.
 *
 * `holdOpen` trata esses ids como abertos só para a ordenação: é a pausa em que o item recém
 * concluído ainda não "afundou".
 */
export function compareSiblings(a: Item, b: Item, holdOpen?: ReadonlySet<string>): number {
  const aDone = a.done && !holdOpen?.has(a.id)
  const bDone = b.done && !holdOpen?.has(b.id)
  if (aDone !== bDone) return aDone ? 1 : -1
  const byPriority = TODO_PRIORITY_WEIGHT[a.priority] - TODO_PRIORITY_WEIGHT[b.priority]
  if (byPriority !== 0) return byPriority
  if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

/**
 * Chave de rank entre duas outras (`null` = sem limite). Se os limites vieram invertidos ou iguais —
 * dado duplicado por uma importação ou por duas abas — cai para "depois de `prev`" em vez de lançar.
 */
export function rankBetween(prev: string | null, next: string | null): string {
  if (prev !== null && next !== null && prev >= next) return generateKeyBetween(prev, null)
  return generateKeyBetween(prev, next)
}

/** Maior rank de uma faixa de prioridade entre os irmãos (`null` se a faixa está vazia). */
function lastRankInBand(siblings: readonly Item[], priority: Priority): string | null {
  let last: string | null = null
  for (const sibling of siblings) {
    if (sibling.priority === priority && (last === null || sibling.rank > last)) last = sibling.rank
  }
  return last
}

/** Rank que põe um item no FIM da sua faixa de prioridade. `siblings` não inclui o próprio item. */
export function rankAtEndOfBand(siblings: readonly Item[], priority: Priority): string {
  return rankBetween(lastRankInBand(siblings, priority), null)
}

/**
 * Prioridade que um item adota ao ser solto entre dois irmãos: a do vizinho, se são iguais; senão a
 * do vizinho mais próximo do ponteiro. Sem vizinhos, mantém a prioridade atual.
 */
export function resolveDropPriority(
  above: Item | undefined,
  below: Item | undefined,
  nearer: 'above' | 'below',
  fallback: Priority
): Priority {
  if (!above && !below) return fallback
  if (!above) return (below as Item).priority
  if (!below) return above.priority
  if (above.priority === below.priority) return above.priority
  return nearer === 'above' ? above.priority : below.priority
}

/**
 * Rank para um item solto entre `above` e `below` já na prioridade `priority`: só os vizinhos da
 * própria faixa limitam a chave.
 */
export function rankForDrop(
  above: Item | undefined,
  below: Item | undefined,
  priority: Priority
): string {
  const lower = above && above.priority === priority ? above.rank : null
  const upper = below && below.priority === priority ? below.rank : null
  return rankBetween(lower, upper)
}

/** `true` se algum rank da faixa passou do tamanho que justifica reescrevê-los. */
export function needsRebalance(siblings: readonly Item[]): boolean {
  return siblings.some((item) => item.rank.length > MAX_RANK_LENGTH_BEFORE_REBALANCE)
}

/**
 * Ranks novos e curtos para todos os irmãos que precisam: reescreve cada faixa de prioridade inteira
 * preservando a ordem atual. Devolve `{ id: rank }` só dos itens que mudam.
 */
export function rebalanceRanks(siblings: readonly Item[]): Record<string, string> {
  const changes: Record<string, string> = {}
  const bands = new Map<Priority, Item[]>()
  for (const item of siblings) {
    const band = bands.get(item.priority) ?? []
    band.push(item)
    bands.set(item.priority, band)
  }
  for (const band of bands.values()) {
    if (!band.some((item) => item.rank.length > MAX_RANK_LENGTH_BEFORE_REBALANCE)) continue
    const ordered = [...band].sort((a, b) => compareSiblings(a, b))
    const ranks = generateNKeysBetween(null, null, ordered.length)
    ordered.forEach((item, index) => {
      if (item.rank !== ranks[index]) changes[item.id] = ranks[index]
    })
  }
  return changes
}

/**
 * "Ordenar por prazo": dentro de cada faixa de prioridade, prazo mais cedo primeiro e os sem prazo
 * depois, mantendo a ordem atual nos empates. Devolve `{ id: rank }` só das faixas que mudam.
 */
export function rankBySoonestDue(siblings: readonly Item[]): Record<string, string> {
  const changes: Record<string, string> = {}
  const bands = new Map<Priority, Item[]>()
  for (const item of [...siblings].sort((a, b) => compareSiblings(a, b))) {
    const band = bands.get(item.priority) ?? []
    band.push(item)
    bands.set(item.priority, band)
  }
  for (const band of bands.values()) {
    const sorted = band
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aDue = a.item.dueOn
        const bDue = b.item.dueOn
        if (aDue !== bDue) {
          if (aDue === null) return 1
          if (bDue === null) return -1
          return aDue < bDue ? -1 : 1
        }
        return a.index - b.index
      })
      .map(({ item }) => item)
    if (sorted.every((item, index) => item === band[index])) continue
    const ranks = generateNKeysBetween(null, null, sorted.length)
    sorted.forEach((item, index) => {
      changes[item.id] = ranks[index]
    })
  }
  return changes
}
