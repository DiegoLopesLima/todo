import { api } from './axios'

describe('api', () => {
  it('stays same-origin by targeting the relative /api base', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('asks for JSON', () => {
    expect(api.defaults.headers.Accept).toBe('application/json')
  })
})
