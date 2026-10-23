/** One second, in milliseconds — for `setTimeout`/`setInterval` delays. */
export const ONE_SECOND_IN_MS = 1000

/** One minute, in seconds — e.g. short rate-limit windows. */
export const ONE_MINUTE_IN_SECONDS = 60

/** One minute, in milliseconds — e.g. polling cadence for time-relative UI. */
export const ONE_MINUTE_IN_MS = ONE_SECOND_IN_MS * ONE_MINUTE_IN_SECONDS

/** One hour, in seconds — e.g. the lifetime of a short-lived cookie. */
export const ONE_HOUR_IN_SECONDS = ONE_MINUTE_IN_SECONDS * 60

/** One day, in seconds — e.g. cache TTLs that only need to survive a work day. */
export const ONE_DAY_IN_SECONDS = ONE_HOUR_IN_SECONDS * 24

/** One day, in milliseconds — for date arithmetic that steps by whole days. */
export const ONE_DAY_IN_MS = ONE_DAY_IN_SECONDS * ONE_SECOND_IN_MS
