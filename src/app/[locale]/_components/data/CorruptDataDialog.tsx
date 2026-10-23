'use client'

import { useTranslations } from 'next-intl'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/constants/app'
import { downloadTextFile } from '@/lib/download'
import { useTodoUi } from '@/store/todo-ui'
import { useModalOpen } from '../state/useModalOpen'

/**
 * Avisa que os dados salvos não puderam ser lidos. O conteúdo cru NÃO foi apagado: o app subiu vazio
 * e uma cópia ficou guardada; aqui a pessoa pode baixá-la para recuperar o que for possível.
 */
export function CorruptDataDialog() {
  const t = useTranslations('todo.corrupt')
  const common = useTranslations('common')
  const corrupt = useTodoUi((state) => state.corruptData)
  const raw = useTodoUi((state) => state.corruptRaw)
  useModalOpen(corrupt)

  return (
    <AlertDialog
      open={corrupt}
      onOpenChange={(open) => !open && useTodoUi.getState().setCorruptData(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{common('confirm')}</AlertDialogCancel>
          <Button
            onClick={() =>
              downloadTextFile(
                `${APP_NAME.toLowerCase()}-dados-ilegiveis.json`,
                JSON.stringify(raw, null, 2)
              )
            }
          >
            {t('download')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
