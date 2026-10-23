import { z } from 'zod'

/**
 * Builds a required, trimmed string schema. `message` is an **i18n key** from the `validation`
 * namespace (not rendered copy): the form translates it, so the schema stays locale-agnostic.
 *
 * @param max Maximum length — import the limit from `@/constants`, never inline the number.
 */
export function requiredString(message: string, max: number) {
  return z.string().trim().min(1, message).max(max, message)
}

/** An e-mail address, lower-cased so lookups and uniqueness checks are case-insensitive. */
export function emailSchema(message: string) {
  return z.string().trim().toLowerCase().pipe(z.email(message))
}
