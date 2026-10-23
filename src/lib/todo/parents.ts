import { TODO_MAX_DEPTH } from '@/constants/todo'
import { childIds, type Items, subtreeHeight } from '@/lib/todo/tree'

/** Uma opção do seletor de pai. `value: null` é "nenhum" (primeiro nível). */
export type ParentOption = { value: string | null; label: string; depth: number }

/**
 * Os itens que podem ser pai, na ordem da árvore, mais a opção "nenhum" no topo. Com `excludeId`
 * (mover um item existente) saem ele e a subárvore dele — viraria ciclo — e some o que não deixaria
 * o item, com os subitens que leva consigo, caber no limite de níveis.
 */
export function buildParentOptions(
  items: Items,
  { excludeId, noneLabel }: { excludeId?: string; noneLabel: string }
): ParentOption[] {
  const carried = excludeId && items[excludeId] ? subtreeHeight(items, excludeId) : 0
  const maxParentDepth = TODO_MAX_DEPTH - 2 - carried
  const options: ParentOption[] = [{ value: null, label: noneLabel, depth: -1 }]

  const visit = (parentId: string | null, depth: number) => {
    for (const id of childIds(items, parentId)) {
      if (id === excludeId) continue
      if (depth <= maxParentDepth) options.push({ value: id, label: items[id].text, depth })
      visit(id, depth + 1)
    }
  }
  visit(null, 0)
  return options
}
