'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Icon } from '@iconify/react'
import { AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { TODO_DRAG_ACTIVATION_DISTANCE, TODO_INDENT_PX } from '@/constants/todo'
import type { TodoView } from '@/enums/todo'
import { resolveDrop } from '@/lib/todo/drop'
import type { Row } from '@/lib/todo/filters'
import { descendantsOf } from '@/lib/todo/tree'
import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoPrefs } from '@/store/todo-prefs'
import { ItemDetailsSheet } from '../details/ItemDetailsSheet'
import { MoveToDialog } from '../details/MoveToDialog'
import { useTodoActions } from '../state/useTodoActions'
import { DragPreview } from './DragPreview'
import { InlineEditor } from './InlineEditor'
import { indentClass } from './indent'
import { type RowNavigation, type TodoListContextValue, TodoListProvider } from './TodoListContext'
import { TodoRow } from './TodoRow'

type TodoListProps = {
  rows: Row[]
  view: TodoView
  query: string
  /** Abre o histórico filtrado por um item. */
  onHistory: (itemId: string) => void
}

/** Estado de um arrasto em andamento. */
type DragState = { activeId: string; overId: string | null; deltaX: number }

const EMPTY_ICON: Record<TodoView, string> = {
  today: 'lucide:circle-check',
  upcoming: 'lucide:calendar-clock',
  all: 'lucide:list-checks',
}

/** Quanto tempo depois de soltar o clique que o arrasto gera ainda é ignorado. */
const DRAG_CLICK_GUARD_MS = 150

/** Onde, na lista achatada, termina a subárvore da linha `index` (o último descendente). */
function subtreeEnd(rows: readonly Row[], index: number): number {
  let end = index
  while (rows[end + 1] && rows[end + 1].depth > rows[index].depth) end++
  return end
}

/**
 * Descendo na lista, o item acabou de passar pela linha sob o ponteiro (ela fica ACIMA dele); subindo,
 * ela fica ABAIXO. O vizinho mais próximo é o que ele acabou de ultrapassar.
 */
function nearerNeighbor(rows: readonly Row[], activeId: string, overId: string): 'above' | 'below' {
  const from = rows.findIndex((row) => row.id === activeId)
  const to = rows.findIndex((row) => row.id === overId)
  return from < to ? 'above' : 'below'
}

/**
 * A lista de tarefas: uma árvore ARIA com foco "rolante" (a lista é uma única parada de Tab; as
 * setas percorrem as linhas), edição inline, subitem inline, arrastar e soltar e os diálogos de
 * detalhes e de mover.
 */
export function TodoList({ rows, view, query, onHistory }: TodoListProps) {
  const t = useTranslations('todo')
  const actions = useTodoActions()
  const items = useTodoDocument((state) => state.doc.items)
  const listRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [moveToId, setMoveToId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const justDragged = useRef(false)
  // Por quê: detalhes e "Mover para…" abrem por um item de menu que já não existe quando o painel
  // fecha; sem isto o foco cairia no <body> e quem usa teclado perderia o lugar na árvore.
  const dialogRowId = useRef<string | null>(null)
  const returnFocusToRow = useCallback(
    () =>
      listRef.current?.querySelector<HTMLElement>(`[data-row-id="${dialogRowId.current}"]`) ?? null,
    []
  )

  // Por quê: só uma linha que aparece DEPOIS da primeira renderização ganha a animação de entrada —
  // animar as centenas de linhas que já estavam ali ao abrir o app seria ruído, não alegria.
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    seen.current = new Set(rows.map((row) => row.id))
  })

  // Por quê: as linhas só "saem" com animação quando a PESSOA as tira (exclui, recolhe um pai). Ao
  // trocar de aba, buscar ou arrastar, a lista é só outro recorte — animar a saída de tudo seria ruído.
  const viewKey = `${view}|${query}`
  const lastViewKey = useRef(viewKey)
  const viewChanged = lastViewKey.current !== viewKey
  useEffect(() => {
    lastViewKey.current = viewKey
  })

  // Enquanto se arrasta um pai, os filhos somem da lista: vão junto com ele.
  const hidden = useMemo(
    () => (drag ? new Set(descendantsOf(items, drag.activeId)) : null),
    [drag, items]
  )
  const displayRows = useMemo(
    () => (hidden ? rows.filter((row) => !hidden.has(row.id)) : rows),
    [rows, hidden]
  )
  const displayRowsRef = useRef(displayRows)
  displayRowsRef.current = displayRows
  const itemsRef = useRef(items)
  itemsRef.current = items

  const focusRow = useCallback((id: string) => {
    // Por quê: depois de uma ação a linha pode mudar de lugar na árvore; esperar o próximo quadro
    // garante que o React já a remontou antes de devolver o foco.
    requestAnimationFrame(() => {
      const nodes = listRef.current?.querySelectorAll<HTMLElement>('[data-row-id]') ?? []
      for (const node of nodes) {
        if (node.dataset.rowId === id) {
          node.focus()
          return
        }
      }
    })
  }, [])

  const focusRowSoon = (id: string) => {
    setFocusedId(id)
    focusRow(id)
  }

  const dragEnabled = query.trim() === ''
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: TODO_DRAG_ACTIVATION_DISTANCE } })
  )

  const dropFor = useCallback((activeId: string, overId: string | null, deltaX: number) => {
    if (!overId) return null
    return resolveDrop({
      items: itemsRef.current,
      rows: displayRowsRef.current,
      activeId,
      overId,
      deltaX,
      indentPx: TODO_INDENT_PX,
      nearer: nearerNeighbor(displayRowsRef.current, activeId, overId),
    })
  }, [])

  const drop = drag ? dropFor(drag.activeId, drag.overId, drag.deltaX) : null

  const onDragStart = (event: DragStartEvent) =>
    setDrag({ activeId: String(event.active.id), overId: String(event.active.id), deltaX: 0 })
  const onDragMove = (event: DragMoveEvent) =>
    setDrag((current) =>
      current
        ? {
            ...current,
            deltaX: event.delta.x,
            overId: event.over ? String(event.over.id) : current.overId,
          }
        : current
    )
  const onDragOver = (event: DragOverEvent) =>
    setDrag((current) =>
      current && event.over ? { ...current, overId: String(event.over.id) } : current
    )
  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    const result = dropFor(activeId, overId, event.delta.x)
    setDrag(null)
    justDragged.current = true
    setTimeout(() => {
      justDragged.current = false
    }, DRAG_CLICK_GUARD_MS)

    if (!result) return
    if (!result.ok) {
      toast.error(t(`errors.${result.reason}`))
      return
    }
    const { parentId, priority, rank } = result.target
    // Quem caiu dentro de um pai recolhido some da vista; abrir o pai mostra onde ele foi parar.
    if (parentId && useTodoPrefs.getState().collapsed[parentId]) actions.toggleCollapsed(parentId)
    if (actions.move(activeId, { parentId, priority, rank })) focusRowSoon(activeId)
  }
  const tabbableId = rows.some((row) => row.id === focusedId) ? focusedId : (rows[0]?.id ?? null)

  const onNavigate = useCallback(
    (id: string, navigation: RowNavigation) => {
      const list = rowsRef.current
      const index = list.findIndex((row) => row.id === id)
      if (index === -1) return
      let target: Row | undefined
      switch (navigation) {
        case 'next':
          target = list[index + 1]
          break
        case 'prev':
          target = list[index - 1]
          break
        case 'first':
          target = list[0]
          break
        case 'last':
          target = list[list.length - 1]
          break
        case 'firstChild':
          target = list[index + 1]?.depth > list[index].depth ? list[index + 1] : undefined
          break
        case 'parent':
          for (let i = index - 1; i >= 0; i--) {
            if (list[i].depth < list[index].depth) {
              target = list[i]
              break
            }
          }
          break
      }
      if (target) {
        setFocusedId(target.id)
        focusRow(target.id)
      }
    },
    [focusRow]
  )

  const dragging = drag !== null
  // Por quê: a coluna da seta de recolher só existe se alguma linha tem filhos; sem isso, todo item
  // começaria com um vazio de 24 px à esquerda sem motivo.
  const reserveToggle = rows.some((row) => row.hasChildren)
  const value = useMemo<TodoListContextValue>(
    () => ({
      actions,
      tabbableId,
      editingId,
      dragging,
      dragEnabled,
      reserveToggle,
      consumeDragClick: () => {
        const was = justDragged.current
        justDragged.current = false
        return was
      },
      focusRow,
      onFocusRow: setFocusedId,
      onNavigate,
      onStartEdit: setEditingId,
      onStopEdit: (id) => {
        setEditingId(null)
        focusRow(id)
      },
      onAddChild: (id) => {
        if (rowsRef.current.find((row) => row.id === id)?.collapsed) actions.toggleCollapsed(id)
        setAddingChildOf(id)
      },
      onDetails: (id) => {
        dialogRowId.current = id
        setDetailsId(id)
      },
      onHistory,
      onMoveTo: (id) => {
        dialogRowId.current = id
        setMoveToId(id)
      },
      onSortChildren: (id) => {
        actions.run({ type: 'sortByDue', parentId: id })
      },
      onRemove: (id) => {
        const list = rowsRef.current
        const index = list.findIndex((row) => row.id === id)
        const neighbor = list[index + 1] ?? list[index - 1]
        actions.remove(id)
        if (neighbor) {
          setFocusedId(neighbor.id)
          focusRow(neighbor.id)
        }
      },
    }),
    [
      actions,
      tabbableId,
      editingId,
      dragging,
      dragEnabled,
      reserveToggle,
      focusRow,
      onNavigate,
      onHistory,
    ]
  )

  if (rows.length === 0) {
    const searching = query.trim() !== ''
    return (
      <EmptyState
        icon={searching ? 'lucide:search' : EMPTY_ICON[view]}
        title={t(searching ? 'empty.search.title' : `empty.${view}.title`)}
        description={t(searching ? 'empty.search.description' : `empty.${view}.description`, {
          query,
        })}
        className="motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:animate-in motion-safe:duration-300"
      />
    )
  }

  const addParentIndex = addingChildOf
    ? displayRows.findIndex((row) => row.id === addingChildOf)
    : -1
  const addAfterIndex = addParentIndex === -1 ? -1 : subtreeEnd(displayRows, addParentIndex)
  const activeItem = drag ? items[drag.activeId] : undefined
  const newParentId = drop?.ok ? drop.target.parentId : null

  return (
    <TodoListProvider value={value}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDrag(null)}
        accessibility={{
          screenReaderInstructions: { draggable: t('drag.a11y.instructions') },
          announcements: {
            onDragStart: ({ active }) =>
              t('drag.a11y.start', { text: items[String(active.id)]?.text ?? '' }),
            onDragOver: ({ active, over }) =>
              over
                ? t('drag.a11y.over', {
                    text: items[String(active.id)]?.text ?? '',
                    target: items[String(over.id)]?.text ?? '',
                  })
                : undefined,
            onDragEnd: ({ active }) =>
              t('drag.a11y.end', { text: items[String(active.id)]?.text ?? '' }),
            onDragCancel: ({ active }) =>
              t('drag.a11y.cancel', { text: items[String(active.id)]?.text ?? '' }),
          },
        }}
      >
        <SortableContext
          items={displayRows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={listRef}
            role="tree"
            aria-label={t('row.tree')}
            className="flex flex-col gap-0.5"
          >
            <AnimatePresence initial={false} custom={viewChanged || drag !== null}>
              {displayRows.map((row, index) => (
                <Fragment key={row.id}>
                  <TodoRow row={row} isNew={seen.current !== null && !seen.current.has(row.id)} />
                  {index === addAfterIndex && (
                    <div
                      className={cn(
                        'flex min-h-11 items-center gap-1.5 pe-1.5',
                        'motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:animate-in motion-safe:duration-200',
                        indentClass(displayRows[addParentIndex].depth + 1)
                      )}
                    >
                      <span className="grid size-6 shrink-0 place-items-center text-muted-foreground">
                        <Icon icon="lucide:corner-down-right" className="size-4" aria-hidden />
                      </span>
                      <InlineEditor
                        initial=""
                        keepOpen
                        label={t('subitem.label')}
                        placeholder={t('subitem.placeholder')}
                        className="h-8"
                        onCommit={(text) => actions.create(text, { parentId: addingChildOf })}
                        onCancel={() => {
                          const parent = addingChildOf
                          setAddingChildOf(null)
                          if (parent) focusRow(parent)
                        }}
                      />
                    </div>
                  )}
                </Fragment>
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <DragPreview
              item={activeItem}
              carried={hidden?.size ?? 0}
              target={drop?.ok ? drop.target : null}
              parentText={newParentId ? (items[newParentId]?.text ?? null) : null}
            />
          )}
        </DragOverlay>
      </DndContext>
      <ItemDetailsSheet
        itemId={detailsId}
        onClose={() => setDetailsId(null)}
        returnFocusTo={returnFocusToRow}
      />
      <MoveToDialog
        itemId={moveToId}
        onClose={() => setMoveToId(null)}
        returnFocusTo={returnFocusToRow}
      />
    </TodoListProvider>
  )
}
