import type { Formats } from 'next-intl'

/**
 * App-wide named date/time formats, rendered numerically and locale-aware: `shortDate` →
 * dd/MM/yyyy in pt-BR, MM/dd/yyyy in en; `shortDateTime` adds the locale's time. Reference by name
 * via `format.dateTime(date, 'shortDate')`.
 *
 * Wired into the request config (`request.ts`) so both server and client components (next-intl v4's
 * provider inherits it) share them — and into the test intl wrapper so tests format dates exactly
 * as the app does.
 */
export const formats = {
  dateTime: {
    shortDate: { day: '2-digit', month: '2-digit', year: 'numeric' },
    shortDateTime: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  },
} satisfies Formats
