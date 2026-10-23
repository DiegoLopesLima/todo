import { matchesRoute, PROTECTED_ROUTES } from './routes'

describe('matchesRoute', () => {
  it('matches the prefix itself and its sub-routes', () => {
    expect(matchesRoute('/dashboard', PROTECTED_ROUTES)).toBe(true)
    expect(matchesRoute('/dashboard/settings', PROTECTED_ROUTES)).toBe(true)
  })

  it('does not match a path that merely starts with the same letters', () => {
    expect(matchesRoute('/dashboards', PROTECTED_ROUTES)).toBe(false)
    expect(matchesRoute('/', PROTECTED_ROUTES)).toBe(false)
  })
})
