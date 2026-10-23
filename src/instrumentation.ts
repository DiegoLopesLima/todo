/**
 * Next.js runs `register()` once when the server boots. Calling `validateEnv()` here makes
 * environment validation fail-fast at startup (with a readable error) instead of crashing
 * cryptically on the first request that needs a missing/invalid variable. `env` is validated
 * lazily, so this explicit call is what restores fail-fast on boot. Restricted to the Node.js
 * runtime since the env (and the modules that read it) is server-only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env')
    validateEnv()
  }
}
