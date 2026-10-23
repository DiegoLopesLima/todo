import { TODO_PRIORITY_WEIGHT } from '@/constants/todo'
import type { Priority, TodoView } from '@/enums/todo'
import type { DateKey } from '@/lib/todo/dates'
import { compareSiblings } from '@/lib/todo/order'
import { nextOccurrence } from '@/lib/todo/recurrence'
import { childIds, type Items } from '@/lib/todo/tree'
import type { Item, TodoDocument } from '@/lib/validations/todo'

/** Uma linha da lista já achatada, na ordem de exibição. */
export type Row = {
  id: string
  depth: number
  /** O item tem filhos (mesmo que algum esteja oculto pelo filtro). */
  hasChildren: boolean
  /** Os filhos estão recolhidos nesta linha. */
  collapsed: boolean
  /** Linha mostrada só para dar contexto a um descendente que casou (esmaecida, sem ação). */
  isContext: boolean
}

export type RowOptions = {
  view: TodoView
  query: string
  today: DateKey
  collapsed: Readonly<Record<string, true>>
  /** Itens recém-concluídos que ainda ocupam o lugar de abertos (a pausa antes de afundar). */
  holdOpen?: ReadonlySet<string>
}

/** Prévia, em Próximos, da próxima data de uma série — não é um item e não pode ser concluída. */
export type SeriesPreview = {
  seriesId: string
  text: string
  priority: Priority
  date: DateKey
}

type Node = { id: string; context: boolean; children: Node[] }

/** Minúsculas e sem acentos: "revisão" casa com "revisao". */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

function nonNull<T>(value: T | null): value is T {
  return value !== null
}

/** Filhos na ordem de exibição, considerando os itens que seguram o lugar de "aberto". */
function orderedChildren(
  items: Items,
  parentId: string | null,
  holdOpen: ReadonlySet<string> | undefined
): readonly string[] {
  const base = childIds(items, parentId)
  if (!holdOpen || holdOpen.size === 0 || !base.some((id) => holdOpen.has(id))) return base
  return [...base].sort((a, b) => compareSiblings(items[a], items[b], holdOpen))
}

function activeToday(item: Item, today: DateKey): boolean {
  return item.startsOn === null || item.startsOn <= today
}

/** O item entra na visão por conta própria (a porta de entrada de uma subárvore). */
function qualifies(item: Item, view: TodoView, today: DateKey): boolean {
  switch (view) {
    case 'today':
      return activeToday(item, today) && (!item.done || item.completedOn === today)
    case 'upcoming':
      return item.startsOn !== null && item.startsOn > today && !item.done
    case 'all':
      return true
  }
}

/** Filho de um item já presente: o checklist inteiro vem junto, exceto o que está agendado para depois. */
function joinsParent(item: Item, view: TodoView, today: DateKey): boolean {
  return view === 'today' ? activeToday(item, today) : true
}

/**
 * As linhas visíveis da lista para uma visão, busca e estado de recolhimento.
 *
 * Um pai aparece sempre que algum descendente aparece — como contexto esmaecido quando só o
 * descendente casou. Durante uma busca nada fica recolhido, para o resultado nunca ficar escondido.
 */
export function buildVisibleRows(items: Items, options: RowOptions): Row[] {
  const { view, today, collapsed, holdOpen } = options
  const query = normalizeSearch(options.query)
  const searching = query !== ''

  const build = (id: string, parentIncluded: boolean): Node | null => {
    const item = items[id]
    const included = parentIncluded ? joinsParent(item, view, today) : qualifies(item, view, today)
    const kids = orderedChildren(items, id, holdOpen)
    if (included) {
      return { id, context: false, children: kids.map((kid) => build(kid, true)).filter(nonNull) }
    }
    const children = kids.map((kid) => build(kid, false)).filter(nonNull)
    return children.length > 0 ? { id, context: true, children } : null
  }

  const prune = (node: Node): Node | null => {
    if (normalizeSearch(items[node.id].text).includes(query)) return node
    const children = node.children.map(prune).filter(nonNull)
    return children.length > 0 ? { id: node.id, context: true, children } : null
  }

  let roots = orderedChildren(items, null, holdOpen)
    .map((id) => build(id, false))
    .filter(nonNull)
  if (searching) roots = roots.map(prune).filter(nonNull)

  const rows: Row[] = []
  const flatten = (node: Node, depth: number): void => {
    const isCollapsed = !searching && collapsed[node.id] === true && node.children.length > 0
    rows.push({
      id: node.id,
      depth,
      hasChildren: childIds(items, node.id).length > 0,
      collapsed: isCollapsed,
      isContext: node.context,
    })
    if (isCollapsed) return
    for (const child of node.children) flatten(child, depth + 1)
  }
  for (const root of roots) flatten(root, 0)
  return rows
}

/**
 * Para cada série ainda ativa, a próxima data prevista depois de hoje. Ordenadas por data e, no
 * empate, por prioridade e texto.
 */
export function upcomingPreviews(doc: TodoDocument, today: DateKey): SeriesPreview[] {
  const previews: SeriesPreview[] = []
  for (const series of Object.values(doc.series)) {
    const generatedUntil = doc.cursors[series.id]
    const after = generatedUntil && generatedUntil > today ? generatedUntil : today
    const date = nextOccurrence(series.rule, series.startsOn, after)
    if (date === null || (series.endsOn !== null && date > series.endsOn)) continue
    previews.push({
      seriesId: series.id,
      text: series.blueprint.text,
      priority: series.blueprint.priority,
      date,
    })
  }
  return previews.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      TODO_PRIORITY_WEIGHT[a.priority] - TODO_PRIORITY_WEIGHT[b.priority] ||
      a.text.localeCompare(b.text)
  )
}
