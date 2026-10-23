'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useMediaQuery } from 'usehooks-ts'

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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fieldsToRule, ruleToFields } from '@/lib/todo/recurrence-form'
import { childIds } from '@/lib/todo/tree'
import {
  type DetailsFormValues,
  detailsFormSchema,
  type Item,
  type Series,
} from '@/lib/validations/todo'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoUi } from '@/store/todo-ui'
import { useModalOpen } from '../state/useModalOpen'
import { useTodoActions } from '../state/useTodoActions'
import { DateField } from './DateField'
import { RepeatFields } from './RepeatFields'

type ItemDetailsSheetProps = {
  itemId: string | null
  onClose: () => void
  /** Para onde o foco volta ao fechar (a linha do item): quem usa teclado não perde o lugar. */
  returnFocusTo?: () => HTMLElement | null
}

/** Painel de datas e repetição de um item (lateral no desktop, inferior no celular). */
export function ItemDetailsSheet({ itemId, onClose, returnFocusTo }: ItemDetailsSheetProps) {
  const t = useTranslations('todo.details')
  const common = useTranslations('common')
  const item = useTodoDocument((state) => (itemId ? state.doc.items[itemId] : undefined))
  const series = useTodoDocument((state) =>
    item?.seriesId ? state.doc.series[item.seriesId] : undefined
  )
  const isMobile = useMediaQuery('(max-width: 639px)', { initializeWithValue: false })
  const open = item !== undefined
  useModalOpen(open)

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetPopup
        side={isMobile ? 'bottom' : 'right'}
        fullscreenOnMobile
        finalFocus={returnFocusTo}
        closeProps={{ 'aria-label': common('close') }}
        className="sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="truncate pe-8">{item?.text}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>
        {item && <DetailsForm key={item.id} item={item} series={series} onClose={onClose} />}
      </SheetPopup>
    </Sheet>
  )
}

function DetailsForm({
  item,
  series,
  onClose,
}: {
  item: Item
  series: Series | undefined
  onClose: () => void
}) {
  const t = useTranslations('todo.details')
  const common = useTranslations('common')
  const v = useTranslations('validation')
  const actions = useTodoActions()
  const today = useTodoUi((state) => state.today)
  const hasChildren = useTodoDocument((state) => childIds(state.doc.items, item.id).length > 0)
  const openOccurrences = useTodoDocument((state) =>
    series
      ? Object.values(state.doc.items).filter((i) => i.seriesId === series.id && !i.done).length
      : 0
  )
  const [scope, setScope] = useState<'this' | 'future'>('this')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [alsoDeleteDone, setAlsoDeleteDone] = useState(false)

  const anchor = item.occurrenceOn ?? item.startsOn ?? today
  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsFormSchema),
    defaultValues: {
      startsOn: item.startsOn,
      dueOn: item.dueOn,
      ...ruleToFields(series?.rule ?? null, series?.endsOn ?? null, anchor),
    },
  })
  const { control, handleSubmit, formState } = form

  const dateError = (name: 'startsOn' | 'dueOn') => {
    const message = formState.errors[name]?.message
    return typeof message === 'string' ? v(message) : null
  }

  const onSubmit = (values: DetailsFormValues) => {
    const rule = fieldsToRule(values)
    let ok = true

    if (!series) {
      if (rule) {
        // O item vira o molde de uma série: as datas dele deixam de existir, cada ocorrência tem a sua.
        ok = actions.run({
          type: 'makeRecurring',
          id: item.id,
          rule,
          startsOn: values.startsOn ?? today,
          endsOn: values.endsOn,
        }).ok
      } else {
        ok = saveDates(values)
      }
    } else {
      ok = saveDates(values)
      if (ok && scope === 'future') {
        if (!rule) {
          ok = actions.run({ type: 'endSeries', id: series.id }).ok
        } else {
          const result = actions.run({
            type: 'editSeries',
            id: series.id,
            patch: { rule, endsOn: values.endsOn },
            fromDate: item.occurrenceOn ?? undefined,
          })
          ok = result.ok || result.reason === 'no-change'
        }
      }
    }
    if (ok) onClose()
  }

  /** Grava início e prazo do item (só o que mudou). `true` se não havia nada a gravar. */
  const saveDates = (values: DetailsFormValues): boolean => {
    const patch: { startsOn?: string | null; dueOn?: string | null } = {}
    if (values.startsOn !== item.startsOn) patch.startsOn = values.startsOn
    if (values.dueOn !== item.dueOn) patch.dueOn = values.dueOn
    return Object.keys(patch).length === 0 || actions.edit(item.id, patch)
  }

  return (
    <>
      <SheetPanel>
        <form
          id="details-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="startsOn"
              render={({ field }) => (
                <DateField
                  id="details-starts"
                  label={t('startsOn')}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={dateError('startsOn') !== null}
                />
              )}
            />
            <Controller
              control={control}
              name="dueOn"
              render={({ field }) => (
                <DateField
                  id="details-due"
                  label={t('dueOn')}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={dateError('dueOn') !== null}
                />
              )}
            />
          </div>
          {dateError('dueOn') && (
            <p className="-mt-3 text-destructive-foreground text-xs">{dateError('dueOn')}</p>
          )}

          {series && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('scope.label')}</Label>
              <ToggleGroup
                value={[scope]}
                variant="outline"
                size="sm"
                className="flex-wrap"
                aria-label={t('scope.label')}
                onValueChange={(next) => {
                  if (next[0] === 'this' || next[0] === 'future') setScope(next[0])
                }}
              >
                <ToggleGroupItem value="this">{t('scope.this')}</ToggleGroupItem>
                <ToggleGroupItem value="future">{t('scope.future')}</ToggleGroupItem>
              </ToggleGroup>
              <p className="text-muted-foreground text-xs">{t(`scope.hint.${scope}`)}</p>
            </div>
          )}

          {/* Numa ocorrência, a repetição só é editável quando o alcance é "esta e as futuras". */}
          <RepeatFields form={form} disabled={series !== undefined && scope === 'this'} />

          {series && (
            <div className="flex flex-col gap-2 border-t pt-4">
              {hasChildren && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    if (actions.run({ type: 'applyStructureToSeries', itemId: item.id }).ok)
                      onClose()
                  }}
                >
                  <Icon icon="lucide:list-checks" className="size-4" aria-hidden />
                  {t('applyStructure')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  if (actions.run({ type: 'endSeries', id: series.id }).ok) onClose()
                }}
              >
                <Icon icon="lucide:calendar-x" className="size-4" aria-hidden />
                {t('endSeries')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start text-destructive-foreground"
                onClick={() => setConfirmingDelete(true)}
              >
                <Icon icon="lucide:trash-2" className="size-4" aria-hidden />
                {t('deleteSeries')}
              </Button>
            </div>
          )}
        </form>
      </SheetPanel>
      <SheetFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          {common('cancel')}
        </Button>
        <Button type="submit" form="details-form">
          {t('save')}
        </Button>
      </SheetFooter>

      {series && (
        <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteConfirm.description', { count: openOccurrences })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Label className="gap-2 py-1 font-normal">
              <Checkbox
                checked={alsoDeleteDone}
                onCheckedChange={(checked) => setAlsoDeleteDone(checked === true)}
              />
              {t('deleteConfirm.alsoDone')}
            </Label>
            <AlertDialogFooter>
              <AlertDialogCancel>{common('cancel')}</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  const result = actions.run({
                    type: 'deleteSeries',
                    id: series.id,
                    deleteDone: alsoDeleteDone,
                  })
                  setConfirmingDelete(false)
                  if (result.ok) onClose()
                }}
              >
                {t('deleteConfirm.confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
