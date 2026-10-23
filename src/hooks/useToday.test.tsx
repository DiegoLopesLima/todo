import { act, renderHook } from '@testing-library/react'

import { useToday } from '@/hooks/useToday'

describe('useToday', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 10, 23, 59, 30))
  })
  afterEach(() => jest.useRealTimers())

  it('devolve o dia local de hoje', () => {
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-03-10')
  })

  it('vira sozinho na meia-noite, com o app aberto', () => {
    const { result } = renderHook(() => useToday())
    act(() => {
      jest.advanceTimersByTime(40_000)
    })
    expect(result.current).toBe('2026-03-11')
  })

  it('atualiza ao voltar o foco (o computador pode ter dormido)', () => {
    const { result } = renderHook(() => useToday())
    jest.setSystemTime(new Date(2026, 2, 12, 9, 0, 0))
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current).toBe('2026-03-12')
  })

  it('atualiza quando a aba volta a ficar visível', () => {
    const { result } = renderHook(() => useToday())
    jest.setSystemTime(new Date(2026, 2, 13, 9, 0, 0))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe('2026-03-13')
  })

  it('para de agendar e de ouvir ao desmontar', () => {
    const removeDocument = jest.spyOn(document, 'removeEventListener')
    const removeWindow = jest.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useToday())
    unmount()
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(removeWindow).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(jest.getTimerCount()).toBe(0)
  })
})
