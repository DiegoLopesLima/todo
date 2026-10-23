import { TextDecoder, TextEncoder } from 'node:util'
import { deserialize, serialize } from 'node:v8'
import '@testing-library/jest-dom'

// jsdom doesn't expose `structuredClone` (Node does). `fake-indexeddb`, which stands in for the
// browser's IndexedDB in the storage tests, clones every value it stores with it.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value))
}

// jsdom doesn't expose TextEncoder/TextDecoder as globals (Node does). Several libraries (database
// drivers, crypto helpers) instantiate `new TextEncoder()` at module load, so any test that
// transitively imports one throws `TextEncoder is not defined` before its code runs. Polyfill from
// `node:util` so those modules load under jsdom.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

// jsdom doesn't implement matchMedia, which next-themes calls when reading the system color
// scheme. Polyfill a no-op so the ThemeProvider renders in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// Base UI's menu/positioner needs APIs jsdom doesn't implement. Stub them so dropdown menus can
// open in component tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView ||= () => {}
  Element.prototype.hasPointerCapture ||= () => false
  Element.prototype.setPointerCapture ||= () => {}
  Element.prototype.releasePointerCapture ||= () => {}
  // Base UI's ScrollArea reads `getAnimations()` on its viewport; jsdom doesn't implement the Web
  // Animations API. Stub it to none.
  Element.prototype.getAnimations ||= () => []
}

// jsdom doesn't implement PointerEvent, which Base UI constructs on click (e.g. the Switch root).
// Polyfill it as a thin MouseEvent subclass so pointer-driven controls can be exercised in
// component tests.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    public pointerId: number
    public pointerType: string
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? ''
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
}

// Services fail open/closed on purpose (cache down, e-mail provider down, …) and log via
// `console.error`/`console.warn` on that path — see `src/services/CLAUDE.md`. A passing test
// exercising that path is expected to hit the log, not a defect, so silence it by default instead
// of letting every such test print a false alarm. A test that wants to assert on the message can
// still `jest.spyOn(console, 'error')` itself; it wraps this spy and behaves the same.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})
