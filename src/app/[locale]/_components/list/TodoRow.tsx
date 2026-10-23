'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@iconify/react'
import { m, useIsPresent } from 'motion/react'
import { useTranslations } from 'next-intl'
import { type KeyboardEvent, memo, useRef, useState } from 'react'

import { IconButton } from '@/components/IconButton'
import { Progress } from '@/components/ui/progress'
import { PRIORITIES } from '@/enums/todo'
import { progressOf, checkState as toCheckState } from '@/lib/todo/completion'
import type { Row } from '@/lib/todo/filters'
import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoUi } from '@/store/todo-ui'
import { InlineEditor } from './InlineEditor'
import { indentClass } from './indent'
import { RowBadges } from './RowBadges'
import { RowCheck } from './RowCheck'
import { RowMenu } from './RowMenu'
import { useTodoList } from './TodoListContext'

type TodoRowProps = { row: Row; isNew?: boolean }

/**
 * A saída da linha (excluída, ou escondida por recolher o pai): esmaece, desliza um pouco e
 * encolhe a altura, então as vizinhas sobem junto. `instant` (trocar de aba, buscar, arrastar) pula
 * a animação — ali as linhas não "saíram", só deixaram de caber na vista.
 */
const ROW_VARIANTS = {
  gone: (instant: boolean) =>
    instant
      ? { opacity: 0, transition: { duration: 0 } }
      : {
          opacity: 0,
          x: -12,
          height: 0,
          minHeight: 0,
          transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const },
        },
}

/**
 * Uma linha da lista. A linha INTEIRA é o alvo do clique (marca/desmarca); chevron, lápis e menu
 * param a propagação. Teclado: setas navegam, Espaço alterna, Enter/F2 edita, Alt+setas move,
 * 1–4 definem a prioridade, Delete exclui.
 */
export const TodoRow = memo(function TodoRow({ row, isNew = false }: TodoRowProps) {
  const t = useTranslations('todo')
  const list = useTodoList()
  const { actions } = list
  const liveItem = useTodoDocument((state) => state.doc.items[row.id])
  // Por quê: ao excluir, o item some do documento ANTES de a animação de saída terminar. Guardar o
  // último valor deixa a linha se desenhar até o fim em vez de sumir de uma vez.
  const lastItem = useRef(liveItem)
  if (liveItem) lastItem.current = liveItem
  const item = liveItem ?? lastItem.current
  const present = useIsPresent()
  const doneCount = useTodoDocument((state) => progressOf(state.doc.items).get(row.id)?.done ?? 0)
  const totalCount = useTodoDocument((state) => progressOf(state.doc.items).get(row.id)?.total ?? 0)
  const today = useTodoUi((state) => state.today)
  const [menuOpen, setMenuOpen] = useState(false)
  const sortable = useSortable({ id: row.id, disabled: !list.dragEnabled })

  if (!item) return null

  const { id } = item
  const interactive = !row.isContext
  const editing = list.editingId === id
  const state = row.hasChildren
    ? toCheckState({ done: doneCount, total: totalCount })
    : item.done
      ? 'checked'
      : 'unchecked'
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const canDrag = list.dragEnabled && interactive && !item.done && !editing

  const onClick = () => {
    if (!interactive || editing) return
    // Selecionar texto com o mouse não deve marcar a tarefa.
    if (window.getSelection()?.toString()) return
    if (list.consumeDragClick()) return
    actions.toggle(id)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Teclas vindas do menu, do editor ou de outro controle não são da linha.
    if (event.target !== event.currentTarget) return
    if (event.ctrlKey || event.metaKey) return

    if (event.altKey) {
      const mover: Record<string, ((rowId: string) => boolean) | undefined> = {
        ArrowUp: actions.moveUp,
        ArrowDown: actions.moveDown,
        ArrowRight: actions.indent,
        ArrowLeft: actions.outdent,
      }
      const move = mover[event.key]
      if (move) {
        event.preventDefault()
        move(id)
        list.focusRow(id)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        event.preventDefault()
        list.onNavigate(id, 'next')
        break
      case 'ArrowUp':
      case 'k':
        event.preventDefault()
        list.onNavigate(id, 'prev')
        break
      case 'Home':
        event.preventDefault()
        list.onNavigate(id, 'first')
        break
      case 'End':
        event.preventDefault()
        list.onNavigate(id, 'last')
        break
      case 'ArrowRight':
        event.preventDefault()
        if (row.hasChildren && row.collapsed) actions.toggleCollapsed(id)
        else if (row.hasChildren) list.onNavigate(id, 'firstChild')
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (row.hasChildren && !row.collapsed) actions.toggleCollapsed(id)
        else list.onNavigate(id, 'parent')
        break
      case ' ':
        event.preventDefault()
        if (interactive) actions.toggle(id)
        break
      case 'Enter':
      case 'F2':
        event.preventDefault()
        if (interactive) list.onStartEdit(id)
        break
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        if (interactive) list.onRemove(id)
        break
      case 'd':
        if (interactive) list.onDetails(id)
        break
      case 'ContextMenu':
        event.preventDefault()
        setMenuOpen(true)
        break
      case 'F10':
        if (event.shiftKey) {
          event.preventDefault()
          setMenuOpen(true)
        }
        break
      default: {
        const priority = PRIORITIES[Number(event.key) - 1]
        if (priority && interactive) actions.setPriority(id, priority)
      }
    }
  }

  return (
    // Por quê: o transform do dnd-kit vai num wrapper e a animação de layout do motion na linha — dois
    // donos do mesmo `transform` na mesma tag brigariam; durante o arrasto o layout é desligado.
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(sortable.isDragging && 'opacity-40')}
    >
      <m.div
        // Por quê: `position` anima só o deslocamento — quando um item conclui e afunda, ou outro é
        // movido, as linhas vizinhas deslizam para o novo lugar em vez de pular.
        layout={list.dragging ? false : 'position'}
        transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
        variants={ROW_VARIANTS}
        exit="gone"
        role="treeitem"
        aria-level={row.depth + 1}
        aria-expanded={row.hasChildren ? !row.collapsed : undefined}
        aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
        aria-disabled={interactive ? undefined : true}
        // Uma linha que está saindo já não existe para quem usa leitor de tela.
        aria-hidden={present ? undefined : true}
        tabIndex={list.tabbableId === id ? 0 : -1}
        data-row-id={id}
        data-done={item.done}
        data-context={row.isContext || undefined}
        className={cn(
          'group/row relative flex min-h-11 items-center gap-1.5 rounded-lg pe-1.5 text-sm outline-none transition-colors',
          indentClass(row.depth),
          interactive
            ? 'cursor-pointer hover:bg-accent/60 focus-visible:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring/50'
            : 'cursor-default opacity-60',
          item.done && 'text-muted-foreground',
          !present && 'pointer-events-none overflow-hidden',
          isNew &&
            'motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:animate-in motion-safe:duration-300'
        )}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          if (event.target === event.currentTarget) list.onFocusRow(id)
        }}
      >
        {row.hasChildren ? (
          <IconButton
            icon="lucide:chevron-right"
            label={t(row.collapsed ? 'row.expand' : 'row.collapse', { text: item.text })}
            side="top"
            size="icon-xs"
            tabIndex={-1}
            className="text-muted-foreground"
            iconClassName={cn(
              'transition-transform duration-200 motion-reduce:transition-none',
              !row.collapsed && 'rotate-90'
            )}
            onClick={(event) => {
              event.stopPropagation()
              actions.toggleCollapsed(id)
            }}
          />
        ) : (
          list.reserveToggle && <span className="size-6 shrink-0" aria-hidden />
        )}

        <RowCheck state={state} />

        <div className="min-w-0 flex-1 py-2">
          {editing ? (
            <InlineEditor
              initial={item.text}
              label={t('row.editLabel')}
              onCommit={(text) => actions.edit(id, { text })}
              onCancel={() => list.onStopEdit(id)}
              onTab={(direction, text) => {
                if (text !== '' && text !== item.text) actions.edit(id, { text })
                if (direction === 1) actions.indent(id)
                else actions.outdent(id)
              }}
              className="h-8"
            />
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                data-done={item.done}
                // Por quê: `text-decoration` não anima. O risco é um gradiente de fundo cuja largura
                // vai de 0 a 100% — no texto que quebra em várias linhas, `box-decoration-clone`
                // repete o risco em cada uma.
                className="min-w-0 break-words bg-linear-to-r from-current to-current bg-no-repeat [background-position:0_58%] [background-size:0%_1.5px] box-decoration-clone transition-[background-size] duration-300 ease-out motion-reduce:transition-none data-[done=true]:[background-size:100%_1.5px]"
              >
                {item.text}
              </span>
              <RowBadges item={item} today={today} />
              {row.hasChildren && (
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {t('row.progress', { done: doneCount, total: totalCount })}
                </span>
              )}
            </div>
          )}
          {row.hasChildren && !editing && (
            <Progress
              value={progressPct}
              aria-label={t('row.progress', { done: doneCount, total: totalCount })}
              className="mt-1.5 max-w-44 gap-0"
            />
          )}
        </div>

        {interactive && !editing && (
          <div
            className={cn(
              'flex shrink-0 items-center transition-opacity',
              'opacity-0 focus-within:opacity-100 group-hover/row:opacity-100 group-focus-visible/row:opacity-100',
              menuOpen && 'opacity-100',
              '[@media(pointer:coarse)]:opacity-100'
            )}
          >
            {canDrag && (
              <button
                type="button"
                ref={sortable.setActivatorNodeRef}
                aria-label={t('row.drag', { text: item.text })}
                {...sortable.attributes}
                {...sortable.listeners}
                // Por quê: só a alça inicia o arrasto, e `touch-none` impede o navegador de tomar o
                // gesto para rolar a página — o resto da linha continua rolando normalmente no toque.
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="grid size-8 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
              >
                <Icon icon="lucide:grip-vertical" className="size-4" aria-hidden />
              </button>
            )}
            <IconButton
              icon="lucide:pencil"
              label={t('row.edit', { text: item.text })}
              side="top"
              size="icon-sm"
              tabIndex={-1}
              className="text-muted-foreground [@media(pointer:coarse)]:hidden"
              onClick={(event) => {
                event.stopPropagation()
                list.onStartEdit(id)
              }}
            />
            <RowMenu
              item={item}
              actions={actions}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onEdit={() => list.onStartEdit(id)}
              onAddChild={() => list.onAddChild(id)}
              onDetails={() => list.onDetails(id)}
              onHistory={() => list.onHistory(id)}
              onMoveTo={() => list.onMoveTo(id)}
              onSortChildren={row.hasChildren ? () => list.onSortChildren(id) : undefined}
            />
          </div>
        )}
      </m.div>
    </div>
  )
})
