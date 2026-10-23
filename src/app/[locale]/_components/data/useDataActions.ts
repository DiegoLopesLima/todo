'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { toast } from 'sonner'

import { APP_NAME } from '@/constants/app'
import { TODO_CLEAR_COMPLETED_DAYS } from '@/constants/todo'
import { downloadTextFile } from '@/lib/download'
import { makeCtx } from '@/lib/todo/ctx'
import { buildExport, serializeExport } from '@/lib/todo/export-import'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoActions } from '../state/useTodoActions'

/** Exportar, dispensar atrasadas e limpar concluídas — as ações "de dados" do menu do cabeçalho. */
export function useDataActions() {
  const t = useTranslations('todo.data')
  const actions = useTodoActions()

  const exportData = useCallback(() => {
    const ctx = makeCtx()
    const file = buildExport(useTodoDocument.getState().doc, ctx)
    downloadTextFile(`${APP_NAME.toLowerCase()}-${ctx.today}.json`, serializeExport(file))
    useTodoDocument.getState().markExported()
    toast.success(t('exported'))
  }, [t])

  const dismissOverdue = useCallback(() => {
    const result = actions.run({ type: 'dismissOverdue' })
    if (result.ok) {
      toast(t('dismissed', { count: result.events[0]?.count ?? 0 }), {
        action: { label: t('undo'), onClick: actions.undo },
      })
    }
  }, [actions, t])

  const clearCompleted = useCallback(() => {
    const result = actions.run({ type: 'clearCompleted', olderThanDays: TODO_CLEAR_COMPLETED_DAYS })
    if (result.ok) {
      toast(t('cleared', { count: result.events[0]?.count ?? 0 }), {
        action: { label: t('undo'), onClick: actions.undo },
      })
    } else if (result.reason === 'no-change') {
      toast(t('nothingToClear'))
    }
  }, [actions, t])

  return { exportData, dismissOverdue, clearCompleted }
}
