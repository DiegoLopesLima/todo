import {
  addDays,
  addMonths,
  daysInMonth,
  diffInDays,
  endOfMonth,
  isRealCalendarDate,
  maxDateKey,
  minDateKey,
  parseDateKey,
  toDateKey,
  toLocalDate,
  weekdayOf,
} from '@/lib/todo/dates'

describe('dates', () => {
  describe('isRealCalendarDate', () => {
    it.each(['2026-03-10', '2024-02-29', '2026-12-31'])('aceita %s', (key) => {
      expect(isRealCalendarDate(key)).toBe(true)
    })

    it.each([
      '2026-02-29',
      '2026-02-31',
      '2026-13-01',
      '2026-00-10',
      '2026-03-00',
      '2026-3-1',
      'x',
    ])('rejeita %s', (key) => {
      expect(isRealCalendarDate(key)).toBe(false)
    })
  })

  it('parseDateKey decompõe e devolve null para inválidos', () => {
    expect(parseDateKey('2026-03-10')).toEqual({ year: 2026, month: 3, day: 10 })
    expect(parseDateKey('2026-02-30')).toBeNull()
  })

  it('daysInMonth considera ano bissexto', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })

  describe('addDays', () => {
    it('cruza mês e ano', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
      expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
    })

    it('não é afetado pelo horário de verão', () => {
      // 2026-03-08 e 2026-11-01 são saltos de horário de verão nos EUA.
      expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
      expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
    })
  })

  describe('addMonths', () => {
    it('mantém o dia quando existe', () => {
      expect(addMonths('2026-01-15', 1)).toBe('2026-02-15')
      expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
    })

    it('prende ao último dia do mês curto', () => {
      expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
      expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
      expect(addMonths('2026-03-31', 1)).toBe('2026-04-30')
    })

    it('aceita meses negativos', () => {
      expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
      expect(addMonths('2026-01-10', -2)).toBe('2025-11-10')
    })
  })

  it('diffInDays é assinado', () => {
    expect(diffInDays('2026-03-10', '2026-03-13')).toBe(3)
    expect(diffInDays('2026-03-13', '2026-03-10')).toBe(-3)
    expect(diffInDays('2026-03-10', '2026-03-10')).toBe(0)
    expect(diffInDays('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('weekdayOf: 0 = domingo', () => {
    expect(weekdayOf('2026-03-08')).toBe(0)
    expect(weekdayOf('2026-03-11')).toBe(3)
    expect(weekdayOf('2026-03-14')).toBe(6)
  })

  it('endOfMonth, maxDateKey e minDateKey', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
    expect(maxDateKey('2026-03-01', '2026-03-02')).toBe('2026-03-02')
    expect(minDateKey('2026-03-01', '2026-03-02')).toBe('2026-03-01')
  })

  it('toDateKey usa o dia local, e toLocalDate volta ao mesmo dia', () => {
    const date = new Date(2026, 2, 10, 23, 59)
    expect(toDateKey(date)).toBe('2026-03-10')
    expect(toDateKey(toLocalDate('2026-03-10'))).toBe('2026-03-10')
  })

  it('rejeita chave inválida na aritmética', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
  })
})
