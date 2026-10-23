import { QUERY_RETRY_COUNT, QUERY_STALE_TIME_MS } from '@/constants/query'
import { makeQueryClient } from './query-client'

describe('makeQueryClient', () => {
  it('applies the app-wide query defaults', () => {
    const { queries } = makeQueryClient().getDefaultOptions()

    expect(queries?.staleTime).toBe(QUERY_STALE_TIME_MS)
    expect(queries?.retry).toBe(QUERY_RETRY_COUNT)
    expect(queries?.refetchOnWindowFocus).toBe(false)
  })

  it('returns an independent client per call, so SSR never shares a cache', () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient())
  })
})
