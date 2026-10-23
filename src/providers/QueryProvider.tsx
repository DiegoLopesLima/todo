'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { makeQueryClient } from '@/lib/query-client'

/**
 * Gives the tree its TanStack `QueryClient`. Created once per mount in state — a module-level
 * client would be shared across requests during SSR and leak one user's cache into another's.
 *
 * @see Providers — único consumidor
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
