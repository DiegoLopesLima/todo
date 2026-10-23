import { isMacPlatform, modKeyLabel } from '@/lib/platform'

function userAgent(value: string) {
  Object.defineProperty(navigator, 'userAgent', { value, configurable: true })
}

const original = navigator.userAgent
afterEach(() => userAgent(original))

describe('platform', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', true, '⌘'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', true, '⌘'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false, 'Ctrl'],
    ['Mozilla/5.0 (X11; Linux x86_64)', false, 'Ctrl'],
  ])('%s', (ua, mac, label) => {
    userAgent(ua)
    expect(isMacPlatform()).toBe(mac)
    expect(modKeyLabel()).toBe(label)
  })
})
