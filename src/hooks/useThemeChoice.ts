'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/** The selectable themes, in display order. */
export const THEMES = ['light', 'dark', 'system'] as const

export type ThemeChoice = (typeof THEMES)[number]

/** Iconify id shown for each theme (trigger + option rows). */
export const THEME_ICONS: Record<ThemeChoice, string> = {
  light: 'lucide:sun',
  dark: 'lucide:moon',
  system: 'lucide:monitor-smartphone',
}

/**
 * Theme-selection logic behind {@link ThemeToggle}: exposes the current theme (guarded against
 * hydration mismatch), the trigger icon and a setter. Any other theme control (e.g. a user menu
 * submenu) should reuse this hook rather than call `useTheme` directly.
 */
export function useThemeChoice() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid a hydration mismatch: the active theme is only known on the client.
  useEffect(() => setMounted(true), [])

  const current = (mounted ? theme : undefined) as ThemeChoice | undefined
  const triggerIcon = current ? THEME_ICONS[current] : THEME_ICONS.system

  return { theme, current, triggerIcon, selectTheme: setTheme }
}
