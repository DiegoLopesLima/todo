'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'

/** O id do campo — o atalho `/` o foca por aqui. */
export const SEARCH_INPUT_ID = 'todo-search'

type SearchFieldProps = { value: string; onChange: (value: string) => void }

/** Busca por texto (sem acento nem caixa). O valor vive na URL (`?q=`). */
export function SearchField({ value, onChange }: SearchFieldProps) {
  const t = useTranslations('todo.search')
  return (
    <InputGroup className="h-9 w-full sm:max-w-64 lg:max-w-72">
      <InputGroupAddon>
        <Icon icon="lucide:search" className="size-4" aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        id={SEARCH_INPUT_ID}
        type="search"
        autoComplete="off"
        value={value}
        placeholder={t('placeholder')}
        aria-label={t('label')}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value !== '') {
            event.preventDefault()
            onChange('')
          }
        }}
      />
      {value === '' && (
        // A dica "/ foca a busca" some quando o campo está em foco ou no celular (sem teclado).
        <InputGroupAddon
          align="inline-end"
          className="max-sm:hidden group-focus-within/input-group:hidden"
        >
          <Kbd aria-hidden>/</Kbd>
        </InputGroupAddon>
      )}
      {value !== '' && (
        <InputGroupAddon
          align="inline-end"
          className="motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:animate-in motion-safe:duration-150"
        >
          <InputGroupButton size="icon-xs" aria-label={t('clear')} onClick={() => onChange('')}>
            <Icon icon="lucide:x" className="size-3.5" aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
