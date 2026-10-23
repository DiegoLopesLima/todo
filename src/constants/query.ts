import { ONE_MINUTE_IN_MS } from '@/constants/time'

/** How long a TanStack Query read stays fresh before a remount may refetch it. */
export const QUERY_STALE_TIME_MS = ONE_MINUTE_IN_MS

/** Retries for a failed read before the query settles in the error state. */
export const QUERY_RETRY_COUNT = 1
