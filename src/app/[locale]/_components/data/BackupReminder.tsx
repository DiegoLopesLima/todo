'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { makeCtx } from '@/lib/todo/ctx'
import { shouldRemindBackup } from '@/lib/todo/export-import'
import { useTodoDocument } from '@/store/todo-document'
import { Reveal } from '../feedback/Reveal'
import { useDataActions } from './useDataActions'

/**
 * Lembrete de backup: depois de muitas mudanças sem exportar (ou nunca), sugere baixar o arquivo —
 * limpar os dados do navegador apaga tudo. "Depois" esconde só até recarregar a página.
 */
export function BackupReminder() {
  const t = useTranslations('todo.backup')
  const meta = useTodoDocument((state) => state.doc.meta)
  const hydrated = useTodoDocument((state) => state.hydrated)
  const { exportData } = useDataActions()
  const [snoozed, setSnoozed] = useState(false)

  const show = hydrated && !snoozed && shouldRemindBackup(meta, makeCtx())

  return (
    <Reveal show={show}>
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-info/40 bg-info/10 p-3 text-info-foreground text-sm"
      >
        <Icon icon="lucide:shield-check" className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">{t('message')}</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={exportData}>
            {t('export')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSnoozed(true)}>
            {t('later')}
          </Button>
        </div>
      </div>
    </Reveal>
  )
}
