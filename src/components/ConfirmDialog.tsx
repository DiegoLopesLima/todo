'use client'

import { Icon } from '@iconify/react'
import type { ReactNode } from 'react'
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

/**
 * The shared frame of a "are you sure?" dialog: title, description, a cancel button and a
 * `destructive` confirm button that shows a spinner while `pending`.
 *
 * Presentational on purpose — the caller keeps the action, the toast, the refresh and any impact
 * lookup (`confirmDisabled` holds the confirm button until that lookup settles). Copy always comes
 * in as props from the caller's own i18n namespace.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onConfirm,
  pending = false,
  confirmDisabled = false,
  variant = 'destructive',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  cancelLabel: string
  confirmLabel: string
  onConfirm: () => void
  /** The action is running: cancel and confirm lock, and the confirm button shows a spinner. */
  pending?: boolean
  /** Holds the confirm button for a reason other than `pending` (e.g. impact still loading). */
  confirmDisabled?: boolean
  variant?: 'destructive' | 'default'
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={variant}
            disabled={pending || confirmDisabled}
            aria-busy={pending}
            onClick={onConfirm}
            className="gap-2"
          >
            {pending && (
              <Icon icon="lucide:loader-circle" className="size-4 animate-spin" aria-hidden />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
