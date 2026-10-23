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
import { THEME_ICONS, THEMES, useThemeChoice } from '@/hooks/useThemeChoice'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const t = useTranslations('theme')
  const { theme, triggerIcon, selectTheme } = useThemeChoice()

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label={t('label')}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'text-muted-foreground'
              )}
            >
              <Icon icon={triggerIcon} className="size-[1.15rem]" aria-hidden />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="top">{t('tooltip')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="top" align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={theme} onValueChange={selectTheme}>
          <DropdownMenuLabel>{t('label')}</DropdownMenuLabel>
          {THEMES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-2">
              <Icon
                icon={THEME_ICONS[value]}
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              {t(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
