import { TODO_MAX_DEPTH } from '@/constants/todo'
import { reconcileFrom } from '@/lib/todo/completion'
import type { Ctx } from '@/lib/todo/ctx'
import { ancestorsOf, type Items } from '@/lib/todo/tree'
import type { Item, TodoDocument } from '@/lib/validations/todo'

/** Resultado do reparo: o documento corrigido e quantas correções foram necessárias. */
export type RepairResult = { doc: TodoDocument; fixes: number }

function detach(item: Item): Item {
  return { ...item, parentId: null }
}

/**
 * Conserta o que um arquivo importado ou um dado antigo pode ter quebrado, sem descartar itens:
 * pai inexistente, ciclo, aninhamento acima do limite, vínculo com série que não existe, cursor
 * órfão e o invariante pai↔filhos. Devolve o mesmo objeto se nada precisou mudar.
 */
export function repairDocument(doc: TodoDocument, ctx: Ctx): RepairResult {
  let fixes = 0
  let items: Items = { ...doc.items }

  // Pai inexistente ⇒ vai para a raiz.
  for (const item of Object.values(items)) {
    if (item.parentId !== null && !items[item.parentId]) {
      items[item.id] = detach(item)
      fixes++
    }
  }

  // Ciclo: ao andar para cima, repetir um id do caminho quebra o ciclo naquele elo.
  for (const id of Object.keys(items)) {
    const path = new Set<string>([id])
    let current = items[id]
    while (current.parentId !== null) {
      if (path.has(current.parentId)) {
        items[current.id] = detach(current)
        fixes++
        break
      }
      path.add(current.parentId)
      current = items[current.parentId]
    }
  }

  // Fundo demais: desanexa o primeiro nível que passa do limite, repetidamente.
  for (;;) {
    const tooDeep = Object.keys(items).filter(
      (id) => ancestorsOf(items, id).length > TODO_MAX_DEPTH - 1
    )
    if (tooDeep.length === 0) break
    const shallowest = Math.min(...tooDeep.map((id) => ancestorsOf(items, id).length))
    for (const id of tooDeep) {
      if (ancestorsOf(items, id).length === shallowest) {
        items[id] = detach(items[id])
        fixes++
      }
    }
  }

  // Vínculo com série inexistente ⇒ item comum.
  for (const item of Object.values(items)) {
    if (item.seriesId !== null && !doc.series[item.seriesId]) {
      items[item.id] = { ...item, seriesId: null, occurrenceOn: null }
      fixes++
    }
  }

  const series = { ...doc.series }
  for (const entry of Object.values(series)) {
    if (entry.parentId !== null && !items[entry.parentId]) {
      series[entry.id] = { ...entry, parentId: null }
      fixes++
    }
  }

  const cursors = { ...doc.cursors }
  for (const id of Object.keys(cursors)) {
    if (!series[id]) {
      delete cursors[id]
      fixes++
    }
  }

  const reconciled = reconcileFrom(items, Object.keys(items), ctx)
  fixes += reconciled.changedIds.length
  items = reconciled.items

  if (fixes === 0) return { doc, fixes }
  return { doc: { ...doc, items, series, cursors }, fixes }
}
