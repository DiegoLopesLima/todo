'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useTodoUi } from '@/store/todo-ui'
import { Reveal } from './Reveal'

/**
 * Avisos de estado do armazenamento: o app não consegue salvar (permanente, até voltar a gravar) e
 * "outra aba alterou a lista" (um aviso passageiro).
 */
export function StatusBanners() {
  const t = useTranslations('todo.storage')
  const persistError = useTodoUi((state) => state.persistError)
  const synced = useTodoUi((state) => state.syncedFromOtherTab)

  useEffect(() => {
    if (!synced) return
    toast(t('synced'))
    useTodoUi.getState().setSyncedFromOtherTab(false)
  }, [synced, t])

  // Por quê: ao fechar, o aviso ainda se desenha por 280 ms — e o erro já voltou a `null`.
  const lastError = useRef(persistError)
  if (persistError) lastError.current = persistError
  const shown = persistError ?? lastError.current

  return (
    <Reveal show={persistError !== null}>
      {shown && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive-foreground text-sm"
        >
          <Icon icon="lucide:triangle-alert" className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t(`error.${shown}`)}</p>
        </div>
      )}
    </Reveal>
  )
}
