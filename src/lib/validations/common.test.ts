import { emailSchema, requiredString } from './common'

describe('requiredString', () => {
  const schema = requiredString('required', 5)

  it('trims and accepts a value within the limit', () => {
    expect(schema.parse('  abc  ')).toBe('abc')
  })

  it('rejects empty and over-long values with the given message key', () => {
    expect(schema.safeParse('   ').error?.issues[0].message).toBe('required')
    expect(schema.safeParse('abcdef').error?.issues[0].message).toBe('required')
  })
})

describe('emailSchema', () => {
  const schema = emailSchema('invalid')

  it('normalizes case and whitespace', () => {
    expect(schema.parse('  Ana@Example.COM ')).toBe('ana@example.com')
  })

  it('rejects a malformed address', () => {
    expect(schema.safeParse('not-an-email').error?.issues[0].message).toBe('invalid')
  })
})
