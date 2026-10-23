'use client'

import { Icon } from '@iconify/react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { useMediaQuery } from 'usehooks-ts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { HistoryOrigin } from '@/enums/todo'
import { type DateKey, toDateKey } from '@/lib/todo/dates'
import { formatDayLabel } from '@/lib/todo/format'
import {
  filterHistory,
  HISTORY_CATEGORIES,
  type HistoryCategory,
  undoneEventIds,
} from '@/lib/todo/history'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoUi } from '@/store/todo-ui'
import { DateField } from '../details/DateField'
import { useModalOpen } from '../state/useModalOpen'
import { HistoryEventRow } from './HistoryEventRow'

/** Quantos eventos aparecem de uma vez; "mostrar mais" revela o resto. */
const PAGE_SIZE = 100

type HistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Mostra só o histórico deste item (vindo do menu da linha). */
  itemId: string | null
  onClearItem: () => void
}

/** O histórico de alterações: quando cada item foi criado, marcado, desmarcado, movido, excluído… */
export function HistorySheet({ open, onOpenChange, itemId, onClearItem }: HistorySheetProps) {
  const t = useTranslations('todo.history')
  const common = useTranslations('common')
  const locale = useLocale()
  const today = useTodoUi((state) => state.today)
  const history = useTodoDocument((state) => state.doc.history)
  const itemText = useTodoDocument((state) => (itemId ? state.doc.items[itemId]?.text : undefined))
  const isMobile = useMediaQuery('(max-width: 639px)', { initializeWithValue: false })
  useModalOpen(open)

  const [categories, setCategories] = useState<HistoryCategory[]>([])
  const [origin, setOrigin] = useState<'all' | HistoryOrigin>('all')
  const [from, setFrom] = useState<DateKey | null>(null)
  const [to, setTo] = useState<DateKey | null>(null)
  const [text, setText] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)

  const events = useMemo(
    () =>
      filterHistory(history, {
        types: categories.flatMap((category) => HISTORY_CATEGORIES[category]),
        itemId: itemId ?? undefined,
        origin: origin === 'all' ? undefined : origin,
        from: from ?? undefined,
        to: to ?? undefined,
        text,
      }),
    [history, categories, itemId, origin, from, to, text]
  )
  const undone = useMemo(() => undoneEventIds(history), [history])

  const visible = events.slice(0, shown)
  const groups: { day: DateKey; events: typeof visible }[] = []
  for (const event of visible) {
    const day = toDateKey(new Date(event.at))
    const last = groups.at(-1)
    if (last?.day === day) last.events.push(event)
    else groups.push({ day, events: [event] })
  }
  const filtered = categories.length > 0 || origin !== 'all' || from || to || text.trim() !== ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup
        side={isMobile ? 'bottom' : 'right'}
        fullscreenOnMobile
        closeProps={{ 'aria-label': common('close') }}
        className="sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <div className="flex flex-col gap-4">
            {itemId && (
              <Badge variant="outline" className="w-fit max-w-full gap-1.5 py-1">
                <span className="truncate">{t('forItem', { text: itemText ?? '…' })}</span>
                <button
                  type="button"
                  aria-label={t('filters.clearItem')}
                  className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onClearItem}
                >
                  <Icon icon="lucide:x" className="size-3" aria-hidden />
                </button>
              </Badge>
            )}

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="history-text">{t('filters.search')}</Label>
                <Input
                  id="history-text"
                  type="search"
                  value={text}
                  placeholder={t('filters.searchPlaceholder')}
                  onChange={(event) => {
                    setText(event.target.value)
                    setShown(PAGE_SIZE)
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('filters.type')}</Label>
                <ToggleGroup
                  multiple
                  value={categories}
                  variant="outline"
                  size="sm"
                  className="flex-wrap"
                  aria-label={t('filters.type')}
                  onValueChange={(next) => {
                    setCategories(next as HistoryCategory[])
                    setShown(PAGE_SIZE)
                  }}
                >
                  {(Object.keys(HISTORY_CATEGORIES) as HistoryCategory[]).map((category) => (
                    <ToggleGroupItem key={category} value={category}>
                      {t(`categories.${category}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('filters.origin')}</Label>
                <ToggleGroup
                  value={[origin]}
                  variant="outline"
                  size="sm"
                  aria-label={t('filters.origin')}
                  onValueChange={(next) => {
                    if (next[0]) setOrigin(next[0] as 'all' | HistoryOrigin)
                    setShown(PAGE_SIZE)
                  }}
                >
                  {(['all', 'user', 'system'] as const).map((option) => (
                    <ToggleGroupItem key={option} value={option}>
                      {t(`origin.${option}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateField
                  id="history-from"
                  label={t('filters.from')}
                  value={from}
                  onChange={setFrom}
                />
                <DateField id="history-to" label={t('filters.to')} value={to} onChange={setTo} />
              </div>
              {filtered && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={() => {
                    setCategories([])
                    setOrigin('all')
                    setFrom(null)
                    setTo(null)
                    setText('')
                  }}
                >
                  {t('filters.clear')}
                </Button>
              )}
            </div>

            {events.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground text-sm">
                {history.length === 0 ? t('empty') : t('noMatch')}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((group) => (
                  <section key={group.day} className="flex flex-col gap-1">
                    <h3 className="font-medium text-muted-foreground text-xs first-letter:uppercase">
                      {formatDayLabel(group.day, today, locale)}
                    </h3>
                    <ul className="flex flex-col divide-y">
                      {group.events.map((event) => (
                        <HistoryEventRow
                          key={event.id}
                          event={event}
                          undone={undone.has(event.id)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
                {events.length > shown && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-center"
                    onClick={() => setShown((count) => count + PAGE_SIZE)}
                  >
                    {t('showMore', { count: events.length - shown })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetPanel>
        {/* Só no celular: tela cheia, com a saída ao alcance do polegar, na base. */}
        <SheetFooter className="sm:hidden">
          <SheetClose render={<Button variant="outline" />}>{common('close')}</SheetClose>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  )
}
