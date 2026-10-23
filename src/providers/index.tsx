'use client'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
// Registers the app's used Iconify icons before anything renders — see `src/lib/icons.ts`.
// Side-effect only; nothing here is consumed directly.
import '@/lib/icons'
import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from './ThemeProvider'

/**
 * Root provider tree, already mounted in `[locale]/layout.tsx`. Order matters little, but keep the
 * theme outermost so every portalled surface (dialogs, menus, toasts) inherits it.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* nuqs adapter — lets `useQueryStates` read/write typed URL search params (App Router). */}
      <NuqsAdapter>
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </QueryProvider>
      </NuqsAdapter>
    </ThemeProvider>
  )
}
