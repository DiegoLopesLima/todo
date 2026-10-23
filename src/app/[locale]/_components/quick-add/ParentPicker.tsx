'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { buttonVariants } from '@/components/ui/button'
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { buildParentOptions, type ParentOption } from '@/lib/todo/parents'
import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'

// Recuo do rótulo por nível da árvore, em classes estáticas (o Tailwind precisa vê-las inteiras).
const NEST = ['ps-0', 'ps-3', 'ps-6', 'ps-9', 'ps-12'] as const

import type { ReturnFocus } from './schedule'

type ParentPickerProps = {
  /** O pai escolhido (`null` = nenhum, primeiro nível). */
  value: string | null
  onChange: (parentId: string | null) => void
  /** Para onde o foco volta ao fechar (o campo de texto). */
  returnFocusTo: ReturnFocus
}

/**
 * "Dentro de…" em forma compacta: um botão que mostra o pai escolhido e abre uma lista pesquisável.
 * Sem pai, só o ícone até o breakpoint `md` (e "Dentro de…" depois); com pai, o nome dele.
 */
export function ParentPicker({ value, onChange, returnFocusTo }: ParentPickerProps) {
  const t = useTranslations('todo.quickAdd')
  const items = useTodoDocument((state) => state.doc.items)
  const options = useMemo(() => buildParentOptions(items, { noneLabel: t('noParent') }), [items, t])
  const selected = options.find((option) => option.value === value) ?? options[0]
  const label = value === null ? t('parent') : selected.label

  return (
    <Combobox<ParentOption>
      items={options}
      value={selected}
      onValueChange={(option) => onChange(option?.value ?? null)}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <ComboboxTrigger
              aria-label={t('parentAria', {
                text: value === null ? t('noParent') : selected.label,
              })}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'max-w-28 gap-1.5 px-2 text-muted-foreground md:max-w-40',
                value !== null && 'text-foreground'
              )}
            >
              <Icon icon="lucide:corner-down-right" className="size-4 shrink-0" aria-hidden />
              <span className={cn('truncate', value === null && 'max-md:sr-only')}>{label}</span>
            </ComboboxTrigger>
          }
        />
        <TooltipContent side="top">{t('parentTip')}</TooltipContent>
      </Tooltip>
      <ComboboxPopup
        align="end"
        className="w-72 max-w-[calc(100vw-2rem)]"
        finalFocus={returnFocusTo}
      >
        <div className="p-1 pb-0">
          <ComboboxInput
            showTrigger={false}
            aria-label={t('parent')}
            placeholder={t('parentPlaceholder')}
          />
        </div>
        <ComboboxEmpty>{t('parentEmpty')}</ComboboxEmpty>
        <ComboboxList>
          {(option: ParentOption) => (
            <ComboboxItem key={option.value ?? 'none'} value={option}>
              <span
                className={cn(
                  'block truncate',
                  NEST[Math.min(Math.max(option.depth, 0), NEST.length - 1)]
                )}
              >
                {option.label}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  )
}
