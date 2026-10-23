/**
 * @jest-environment node
 */
import * as route from './route'

it('reports the process as alive', async () => {
  const response = route.GET()

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({ status: 'ok' })
})

it('is never cached, or the probe would answer "ok" for a degraded process', () => {
  expect(route.dynamic).toBe('force-dynamic')
})

it('declares a duration ceiling like every Route Handler', () => {
  expect(route.maxDuration).toBeGreaterThan(0)
})
