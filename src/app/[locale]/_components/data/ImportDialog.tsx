'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TODO_IMPORT_MAX_BYTES, TODO_MAX_ITEMS } from '@/constants/todo'
import { IMPORT_MODES, type ImportMode } from '@/enums/todo'
import { readFileAsText } from '@/lib/download'
import { makeCtx } from '@/lib/todo/ctx'
import { type ImportError, parseImportText, planImport } from '@/lib/todo/export-import'
import type { ExportFile } from '@/lib/validations/todo'
import { useTodoDocument } from '@/store/todo-document'
import { useModalOpen } from '../state/useModalOpen'
import { useTodoActions } from '../state/useTodoActions'

type ImportDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * Importar um arquivo exportado: escolhe o arquivo, mostra o que ele traz e o que cada modo faria
 * (mesclar ou substituir) e só então aplica — como um passo que o Ctrl+Z desfaz.
 */
export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const t = useTranslations('todo.data')
  useModalOpen(open)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* O conteúdo remonta a cada abertura, então o arquivo anterior nunca "vaza" para a próxima. */}
        {open && <ImportBody onClose={() => onOpenChange(false)} title={t('import.title')} />}
      </DialogContent>
    </Dialog>
  )
}

function ImportBody({ onClose, title }: { onClose: () => void; title: string }) {
  const t = useTranslations('todo.data')
  const common = useTranslations('common')
  const actions = useTodoActions()
  const doc = useTodoDocument((state) => state.doc)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<ExportFile | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<ImportError | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')

  const plan = useMemo(
    () => (file ? planImport(doc, file, mode, makeCtx()) : null),
    [doc, file, mode]
  )

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    setFileName(picked.name)
    if (picked.size > TODO_IMPORT_MAX_BYTES) {
      setFile(null)
      setError({ code: 'too-large' })
      return
    }
    const parsed = parseImportText(await readFileAsText(picked))
    if (parsed.ok) {
      setError(null)
      setFile(parsed.file)
    } else {
      setFile(null)
      setError(parsed.error)
    }
  }

  const confirm = () => {
    if (!file || !plan?.ok) return
    const result = actions.run({ type: 'importDocument', mode, file })
    if (!result.ok) return
    toast.success(t('import.done', { count: plan.summary.itemsTotal }), {
      action: { label: t('undo'), onClick: actions.undo },
    })
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{t('import.description')}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label={t('import.chooseFile')}
          onChange={onPick}
        />
        <Button
          type="button"
          variant="outline"
          className="justify-start"
          onClick={() => inputRef.current?.click()}
        >
          <Icon icon="lucide:upload" className="size-4" aria-hidden />
          <span className="truncate">{fileName || t('import.chooseFile')}</span>
        </Button>

        {error && (
          <p role="alert" className="text-destructive-foreground text-sm">
            {t(`import.errors.${error.code}`)}
            {error.path && (
              <span className="mt-1 block break-all font-mono text-xs">{error.path}</span>
            )}
          </p>
        )}

        {file && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-sm">{t('import.mode')}</span>
              <ToggleGroup
                value={[mode]}
                variant="outline"
                size="sm"
                aria-label={t('import.mode')}
                onValueChange={(next) => {
                  const chosen = IMPORT_MODES.find((option) => option === next[0])
                  if (chosen) setMode(chosen)
                }}
              >
                {IMPORT_MODES.map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {t(`import.modes.${option}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-muted-foreground text-xs">{t(`import.modeHint.${mode}`)}</p>
            </div>

            {plan?.ok ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border bg-card p-3 text-sm">
                <dt>{t('import.summary.added')}</dt>
                <dd className="text-end tabular-nums">{plan.summary.itemsAdded}</dd>
                <dt>{t('import.summary.updated')}</dt>
                <dd className="text-end tabular-nums">{plan.summary.itemsUpdated}</dd>
                {mode === 'replace' && (
                  <>
                    <dt className="text-destructive-foreground">{t('import.summary.removed')}</dt>
                    <dd className="text-end text-destructive-foreground tabular-nums">
                      {plan.summary.itemsRemoved}
                    </dd>
                  </>
                )}
                <dt>{t('import.summary.series')}</dt>
                <dd className="text-end tabular-nums">{plan.summary.seriesAdded}</dd>
                <dt className="font-medium">{t('import.summary.total')}</dt>
                <dd className="text-end font-medium tabular-nums">{plan.summary.itemsTotal}</dd>
              </dl>
            ) : (
              <p role="alert" className="text-destructive-foreground text-sm">
                {t('import.errors.limit', { max: TODO_MAX_ITEMS })}
              </p>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          {common('cancel')}
        </Button>
        <Button
          type="button"
          variant={mode === 'replace' ? 'destructive' : 'default'}
          disabled={!file || !plan?.ok}
          onClick={confirm}
        >
          {t('import.confirm')}
        </Button>
      </DialogFooter>
    </>
  )
}
