'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTodoDocument } from '@/store/todo-document'
import { useModalOpen } from '../state/useModalOpen'
import { useTodoActions } from '../state/useTodoActions'
import { ParentCombobox } from './ParentCombobox'

type MoveToDialogProps = {
  itemId: string | null
  onClose: () => void
  /** Para onde o foco volta ao fechar (a linha que foi movida ou da qual se saiu). */
  returnFocusTo?: () => HTMLElement | null
}

const PARENT_FIELD_ID = 'move-to-parent'

/** "Mover para…": escolhe o novo pai numa lista pesquisável — o equivalente de arrastar, sem arrastar. */
export function MoveToDialog({ itemId, onClose, returnFocusTo }: MoveToDialogProps) {
  const t = useTranslations('todo.moveTo')
  const common = useTranslations('common')
  const actions = useTodoActions()
  const item = useTodoDocument((state) => (itemId ? state.doc.items[itemId] : undefined))
  const open = item !== undefined
  useModalOpen(open)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        // Por quê: o diálogo existe para PESQUISAR um pai — o teclado deve abrir já, até no toque (o
        // padrão do Base UI no toque é focar o diálogo para não abrir o teclado sem querer).
        initialFocus={() => document.getElementById(PARENT_FIELD_ID)}
        finalFocus={returnFocusTo}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="truncate">{item?.text}</DialogDescription>
        </DialogHeader>
        {item && (
          <ParentCombobox
            id={PARENT_FIELD_ID}
            autoFocus
            value={item.parentId}
            excludeId={item.id}
            onChange={(parentId) => {
              if (parentId !== item.parentId) actions.moveTo(item.id, parentId)
              onClose()
            }}
          />
        )}
        {/* Só no celular: o modal é tela cheia e a saída fica ao alcance do polegar, na base. */}
        <DialogFooter className="sm:hidden">
          <DialogClose render={<Button variant="outline" />}>{common('close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
