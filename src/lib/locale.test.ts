import { toSupportedLocale } from './locale'

describe('toSupportedLocale', () => {
  it('keeps a supported locale', () => {
    expect(toSupportedLocale('en')).toBe('en')
  })

  it('falls back to the default locale for an unknown or empty value', () => {
    expect(toSupportedLocale('fr')).toBe('pt-BR')
    expect(toSupportedLocale(null)).toBe('pt-BR')
    expect(toSupportedLocale(undefined)).toBe('pt-BR')
  })

  it('uses the given fallback when it is supported', () => {
    expect(toSupportedLocale('fr', 'en')).toBe('en')
  })
})
