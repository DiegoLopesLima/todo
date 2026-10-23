import axios from 'axios'

/**
 * Shared Axios instance for browser → app API calls. All data fetching goes through this (never
 * bare `fetch`), so headers, base URL and future interceptors live in one place. `baseURL` is the
 * relative `/api`, so requests stay same-origin.
 */
export const api = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
})
