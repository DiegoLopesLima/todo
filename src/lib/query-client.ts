import { QueryClient } from '@tanstack/react-query'
import { QUERY_RETRY_COUNT, QUERY_STALE_TIME_MS } from '@/constants/query'

/**
 * Builds the app's TanStack `QueryClient` with its defaults. `refetchOnWindowFocus` is off on
 * purpose: a focus refetch only adds requests; surfaces that need to stay live should be driven
 * by a realtime channel instead.
 *
 * @see QueryProvider — cria uma instância por árvore de providers
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        retry: QUERY_RETRY_COUNT,
        refetchOnWindowFocus: false,
      },
    },
  })
}
