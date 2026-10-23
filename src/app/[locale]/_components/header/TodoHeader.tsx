'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { APP_NAME } from '@/constants/app'
import { OfflineBadge } from '../feedback/OfflineBadge'
import { DayProgress } from './DayProgress'
import { UndoRedoButtons } from './UndoRedoButtons'

/** Cabeçalho: progresso do dia à esquerda; desfazer, histórico/dados e preferências à direita. */
export function TodoHeader({ actions }: { actions?: ReactNode }) {
  const t = useTranslations('todo')
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-col gap-3">
        <h1 className="sr-only">
          {APP_NAME} · {t('title')}
        </h1>
        <DayProgress />
      </div>
      <div className="flex items-center gap-0.5">
        <OfflineBadge />
        <UndoRedoButtons />
        {actions}
        <ThemeToggle />
        <LocaleSwitcher />
      </div>
    </header>
  )
}
