'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type DetailsFormValues, detailsFormSchema } from '@/lib/validations/todo'
import { useTodoUi } from '@/store/todo-ui'
import { DateField } from '../details/DateField'
import { RepeatFields } from '../details/RepeatFields'
import { useModalOpen } from '../state/useModalOpen'
import {
  EMPTY_SCHEDULE,
  formToSchedule,
  isEmptySchedule,
  type ReturnFocus,
  type Schedule,
  scheduleToForm,
} from './schedule'

type ScheduleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Schedule
  onApply: (schedule: Schedule) => void
  /** Para onde o foco volta ao fechar (o campo de texto). */
  returnFocusTo: ReturnFocus
}

/**
 * Modal de "quando e repetição" da tarefa que está sendo criada: quando ela aparece, o prazo e se
 * ela se repete (diária, semanal em dias escolhidos, mensal, anual), com o calendário. Nada é
 * criado aqui — "Aplicar" só guarda a escolha no campo de criação.
 */
export function ScheduleDialog({
  open,
  onOpenChange,
  value,
  onApply,
  returnFocusTo,
}: ScheduleDialogProps) {
  const t = useTranslations('todo.schedule')
  useModalOpen(open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" finalFocus={returnFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Remonta a cada abertura: o formulário sempre parte do que está guardado. */}
        {open && (
          <ScheduleForm
            value={value}
            onApply={(schedule) => {
              onApply(schedule)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ScheduleForm({
  value,
  onApply,
  onCancel,
}: {
  value: Schedule
  onApply: (schedule: Schedule) => void
  onCancel: () => void
}) {
  const t = useTranslations('todo.schedule')
  const details = useTranslations('todo.details')
  const common = useTranslations('common')
  const v = useTranslations('validation')
  const today = useTodoUi((state) => state.today)
  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsFormSchema),
    defaultValues: scheduleToForm(value, today),
  })
  const { control, handleSubmit, formState } = form
  const repeats = useWatch({ control, name: 'freq' }) !== 'none'

  const dateError = formState.errors.dueOn?.message
  const dateMessage = typeof dateError === 'string' ? v(dateError) : null

  return (
    <form
      noValidate
      onSubmit={(event) => {
        // O diálogo mora na árvore do campo de criação: sem isto o "submit" borbulharia até lá.
        event.stopPropagation()
        void handleSubmit((values) => onApply(formToSchedule(values)))(event)
      }}
      className="flex flex-col gap-4 max-sm:flex-1"
    >
      <div className="flex flex-col gap-4 sm:max-h-[min(60vh,28rem)] sm:overflow-y-auto sm:pe-1 max-sm:flex-1">
        <div className={repeats ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
          <Controller
            control={control}
            name="startsOn"
            render={({ field }) => (
              <DateField
                id="schedule-starts"
                label={repeats ? details('startsOnRecurring') : details('startsOn')}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {!repeats && (
            <Controller
              control={control}
              name="dueOn"
              render={({ field }) => (
                <DateField
                  id="schedule-due"
                  label={details('dueOn')}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={dateMessage !== null}
                />
              )}
            />
          )}
        </div>
        {dateMessage && <p className="-mt-2 text-destructive-foreground text-xs">{dateMessage}</p>}
        {repeats && <p className="text-muted-foreground text-xs">{t('recurringHint')}</p>}
        <RepeatFields form={form} />
      </div>

      <DialogFooter>
        {!isEmptySchedule(value) && (
          <Button
            type="button"
            variant="ghost"
            className="sm:me-auto"
            onClick={() => {
              onApply(EMPTY_SCHEDULE)
            }}
          >
            {t('clear')}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          {common('cancel')}
        </Button>
        <Button type="submit">{t('apply')}</Button>
      </DialogFooter>
    </form>
  )
}
