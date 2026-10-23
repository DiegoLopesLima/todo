'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@/components/ui/combobox'
import { buildParentOptions, type ParentOption } from '@/lib/todo/parents'
import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'

// Recuo do rótulo por nível da árvore, em classes estáticas (o Tailwind precisa vê-las inteiras).
const NEST = ['ps-0', 'ps-3', 'ps-6', 'ps-9', 'ps-12'] as const

type ParentComboboxProps = {
  /** O pai escolhido (`null` = nenhum, primeiro nível). */
  value: string | null
  onChange: (parentId: string | null) => void
  /** O item que está sendo movido: ele e a subárvore dele não podem ser o pai. */
  excludeId?: string
  id?: string
  className?: string
  autoFocus?: boolean
}

/** Seletor pesquisável de pai (o `Combobox` do projeto — nunca um `Select`). */
export function ParentCombobox({
  value,
  onChange,
  excludeId,
  id,
  className,
  autoFocus,
}: ParentComboboxProps) {
  const t = useTranslations('todo')
  const items = useTodoDocument((state) => state.doc.items)
  const options = useMemo(
    () => buildParentOptions(items, { excludeId, noneLabel: t('quickAdd.noParent') }),
    [items, excludeId, t]
  )
  const selected = options.find((option) => option.value === value) ?? options[0]

  return (
    <Combobox<ParentOption>
      items={options}
      value={selected}
      onValueChange={(option) => onChange(option?.value ?? null)}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxInput
        id={id}
        autoFocus={autoFocus}
        aria-label={t('quickAdd.parent')}
        placeholder={t('quickAdd.parentPlaceholder')}
        className={cn('w-full', className)}
      />
      <ComboboxPopup>
        <ComboboxEmpty>{t('parent.empty')}</ComboboxEmpty>
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
