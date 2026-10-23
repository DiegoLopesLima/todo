'use client'

import { useTranslations } from 'next-intl'

import { IconButton } from '@/components/IconButton'
import { isMacPlatform, modKeyLabel } from '@/lib/platform'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoActions } from '../state/useTodoActions'

/** Desfazer e refazer, com o estado (habilitado ou não) vindo das pilhas da store. */
export function UndoRedoButtons() {
  const t = useTranslations('todo.undo')
  const actions = useTodoActions()
  const canUndo = useTodoDocument((state) => state.stacks.undo.length > 0)
  const canRedo = useTodoDocument((state) => state.stacks.redo.length > 0)

  return (
    <div className="flex items-center">
      <IconButton
        icon="lucide:undo-2"
        label={t('undo')}
        disabled={!canUndo}
        shortcut={[modKeyLabel(), 'Z']}
        onClick={actions.undo}
        className="text-muted-foreground"
      />
      <IconButton
        icon="lucide:redo-2"
        label={t('redo')}
        disabled={!canRedo}
        shortcut={isMacPlatform() ? [modKeyLabel(), '⇧', 'Z'] : [modKeyLabel(), 'Y']}
        onClick={actions.redo}
        className="text-muted-foreground"
      />
    </div>
  )
}
