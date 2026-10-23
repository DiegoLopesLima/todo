describe('env', () => {
  const original = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = original
    jest.resetModules()
  })

  it('falls back to the local origin when the variable is absent', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const { validateEnv } = await import('./env')
    expect(validateEnv().NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
  })

  it('fails with a readable list when a value is invalid', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-url'
    const { validateEnv } = await import('./env')
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_APP_URL/)
  })

  it('validates lazily: importing the module does not read the variables', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-url'
    await expect(import('./env')).resolves.toBeDefined()
  })
})
