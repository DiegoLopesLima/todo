import { getStandaloneTranslator } from './messages'

describe('getStandaloneTranslator', () => {
  it('translates in the requested locale', async () => {
    const en = await getStandaloneTranslator('en', 'common')
    const pt = await getStandaloneTranslator('pt-BR', 'common')
    expect(en('retry')).toBe('Try again')
    expect(pt('retry')).toBe('Tentar novamente')
  })

  it('falls back to the default locale for an unsupported one', async () => {
    const t = await getStandaloneTranslator('fr', 'common')
    expect(t('retry')).toBe('Tentar novamente')
  })
})
