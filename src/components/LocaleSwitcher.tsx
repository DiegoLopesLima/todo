'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LOCALE_FLAGS, LOCALES, useLocaleChoice } from '@/hooks/useLocaleChoice'
import { cn } from '@/lib/utils'

export function LocaleSwitcher() {
  const t = useTranslations('locale')
  const tLanguages = useTranslations('languages')
  const { locale, isPending, selectLocale } = useLocaleChoice()

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label={t('label')}
              disabled={isPending}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'text-muted-foreground'
              )}
            >
              <Icon
                icon={LOCALE_FLAGS[locale] ?? 'lucide:languages'}
                className="size-[1.15rem]"
                aria-hidden
              />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="top">{t('tooltip')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="top" align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={locale} onValueChange={selectLocale}>
          <DropdownMenuLabel>{t('label')}</DropdownMenuLabel>
          {LOCALES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} className="gap-2">
              <Icon
                icon={LOCALE_FLAGS[code] ?? 'lucide:languages'}
                className="size-4"
                aria-hidden
              />
              {tLanguages(code)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
