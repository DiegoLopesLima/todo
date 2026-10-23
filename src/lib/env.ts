import { z } from 'zod'

/**
 * Server-side environment variables, validated lazily on first access.
 *
 * Validation is deferred to runtime (the first time `env.X` is read, or an explicit `validateEnv()`
 * call) instead of running at module load. This keeps `next build` — which statically imports route
 * modules to collect page data — from crashing when runtime-only secrets aren't present in the
 * build environment. Fail-fast on boot still happens via `validateEnv()` in `src/instrumentation.ts`.
 *
 * Add a variable here **and** to `.env.example` in the same change. An integration that is optional
 * in dev (the feature just degrades) but mandatory in production belongs in a `PRODUCTION_REQUIRED`
 * list checked by `superRefine` — see `docs/recipes/integrations.md`.
 */
const envSchema = z.object({
  // Public origin of the app. Used to build absolute links (metadata, emails, redirects).
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
})

type Env = z.infer<typeof envSchema>

let cached: Env | undefined

/**
 * Validates `process.env` against the schema and returns the parsed values, throwing a readable
 * error listing every missing/invalid variable. The result is memoized, so repeat calls (and every
 * `env` access) are cheap. Call this at server boot to fail fast.
 */
export function validateEnv(): Env {
  if (cached) return cached

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    )
    throw new Error(`Invalid environment variables:\n${issues.join('\n')}`)
  }

  cached = parsed.data
  return cached
}

/**
 * Validated env accessor. Reading any property triggers `validateEnv()` on first access —
 * importing this module has no side effects, so build-time static analysis of route modules never
 * touches (or requires) the variables.
 */
export const env = new Proxy({} as Env, {
  get(_target, prop) {
    return validateEnv()[prop as keyof Env]
  },
})
