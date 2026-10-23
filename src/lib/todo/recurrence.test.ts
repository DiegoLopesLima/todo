import {
  firstOccurrenceOnOrAfter,
  MAX_OCCURRENCES_PER_QUERY,
  nextOccurrence,
  occurrencesInRange,
} from '@/lib/todo/recurrence'
import type { Recurrence } from '@/lib/validations/todo'

const daily = (interval: number): Recurrence => ({ freq: 'daily', interval })
const weekly = (interval: number, weekdays: number[], weekStartsOn: 0 | 1 = 0): Recurrence => ({
  freq: 'weekly',
  interval,
  weekdays,
  weekStartsOn,
})
const monthly = (interval: number, day: number | 'last'): Recurrence => ({
  freq: 'monthly',
  interval,
  day,
})
const yearly = (interval: number): Recurrence => ({ freq: 'yearly', interval })

// 2026-03-01 é domingo; 2026-03-04 é quarta.
describe('recurrence', () => {
  describe('diária', () => {
    it('a cada dia, dentro da janela', () => {
      expect(occurrencesInRange(daily(1), '2026-03-01', '2026-03-03', '2026-03-06')).toEqual([
        '2026-03-03',
        '2026-03-04',
        '2026-03-05',
        '2026-03-06',
      ])
    })

    it('com intervalo, conta a partir da âncora e não da janela', () => {
      expect(occurrencesInRange(daily(3), '2026-03-01', '2026-03-02', '2026-03-10')).toEqual([
        '2026-03-04',
        '2026-03-07',
        '2026-03-10',
      ])
    })

    it('nunca devolve data anterior à âncora', () => {
      expect(occurrencesInRange(daily(1), '2026-03-05', '2026-02-20', '2026-03-06')).toEqual([
        '2026-03-05',
        '2026-03-06',
      ])
    })

    it('atravessa a virada de ano', () => {
      expect(occurrencesInRange(daily(1), '2025-12-30', '2025-12-30', '2026-01-02')).toEqual([
        '2025-12-30',
        '2025-12-31',
        '2026-01-01',
        '2026-01-02',
      ])
    })
  })

  describe('semanal', () => {
    it('toda quarta-feira', () => {
      expect(occurrencesInRange(weekly(1, [3]), '2026-03-01', '2026-03-01', '2026-03-31')).toEqual([
        '2026-03-04',
        '2026-03-11',
        '2026-03-18',
        '2026-03-25',
      ])
    })

    it('vários dias na semana, a partir da âncora', () => {
      expect(
        occurrencesInRange(weekly(1, [1, 3, 5]), '2026-03-04', '2026-03-01', '2026-03-13')
      ).toEqual(['2026-03-04', '2026-03-06', '2026-03-09', '2026-03-11', '2026-03-13'])
    })

    it('a cada duas semanas', () => {
      expect(occurrencesInRange(weekly(2, [3]), '2026-03-04', '2026-03-01', '2026-04-05')).toEqual([
        '2026-03-04',
        '2026-03-18',
        '2026-04-01',
      ])
    })

    it('respeita o início da semana na contagem do intervalo', () => {
      // Semana começando na segunda: domingo (0) pertence à semana ANTERIOR à da segunda seguinte.
      expect(
        occurrencesInRange(weekly(2, [0, 1], 1), '2026-03-02', '2026-03-01', '2026-03-31')
      ).toEqual(['2026-03-02', '2026-03-08', '2026-03-16', '2026-03-22', '2026-03-30'])
    })

    it('janela começando no meio de uma semana válida', () => {
      expect(
        occurrencesInRange(weekly(1, [1, 3]), '2026-03-02', '2026-03-04', '2026-03-09')
      ).toEqual(['2026-03-04', '2026-03-09'])
    })
  })

  describe('mensal', () => {
    it('dia 31 cai no último dia dos meses curtos', () => {
      expect(occurrencesInRange(monthly(1, 31), '2026-01-31', '2026-01-01', '2026-04-30')).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
      ])
    })

    it('"último dia" em ano bissexto', () => {
      expect(
        occurrencesInRange(monthly(1, 'last'), '2024-01-15', '2024-01-01', '2024-03-31')
      ).toEqual(['2024-01-31', '2024-02-29', '2024-03-31'])
    })

    it('se o dia do mês da âncora já passou, a primeira vem no mês seguinte', () => {
      expect(occurrencesInRange(monthly(1, 10), '2026-03-15', '2026-03-01', '2026-05-31')).toEqual([
        '2026-04-10',
        '2026-05-10',
      ])
    })

    it('com intervalo de meses', () => {
      expect(occurrencesInRange(monthly(2, 5), '2026-01-05', '2026-01-01', '2026-06-30')).toEqual([
        '2026-01-05',
        '2026-03-05',
        '2026-05-05',
      ])
    })

    it('atravessa a virada de ano', () => {
      expect(occurrencesInRange(monthly(1, 15), '2025-11-15', '2025-11-01', '2026-02-28')).toEqual([
        '2025-11-15',
        '2025-12-15',
        '2026-01-15',
        '2026-02-15',
      ])
    })
  })

  describe('anual', () => {
    it('29 de fevereiro cai em 28 nos anos não bissextos', () => {
      expect(occurrencesInRange(yearly(1), '2024-02-29', '2024-01-01', '2028-12-31')).toEqual([
        '2024-02-29',
        '2025-02-28',
        '2026-02-28',
        '2027-02-28',
        '2028-02-29',
      ])
    })

    it('com intervalo de anos', () => {
      expect(occurrencesInRange(yearly(2), '2026-03-10', '2026-01-01', '2030-12-31')).toEqual([
        '2026-03-10',
        '2028-03-10',
        '2030-03-10',
      ])
    })
  })

  describe('consultas', () => {
    it('janela invertida devolve vazio', () => {
      expect(occurrencesInRange(daily(1), '2026-03-01', '2026-03-10', '2026-03-05')).toEqual([])
    })

    it('respeita o limite pedido', () => {
      expect(
        occurrencesInRange(daily(1), '2026-03-01', '2026-03-01', '2026-12-31', 3)
      ).toHaveLength(3)
    })

    it('o teto por consulta protege contra um intervalo absurdo', () => {
      const dates = occurrencesInRange(daily(1), '2000-01-01', '2000-01-01', '2100-01-01')
      expect(dates).toHaveLength(MAX_OCCURRENCES_PER_QUERY)
    })

    it('firstOccurrenceOnOrAfter inclui a própria data e antes da âncora devolve a âncora', () => {
      expect(firstOccurrenceOnOrAfter(weekly(1, [3]), '2026-03-04', '2026-03-11')).toBe(
        '2026-03-11'
      )
      expect(firstOccurrenceOnOrAfter(weekly(1, [3]), '2026-03-04', '2026-01-01')).toBe(
        '2026-03-04'
      )
    })

    it('nextOccurrence é estritamente posterior', () => {
      expect(nextOccurrence(daily(1), '2026-03-01', '2026-03-10')).toBe('2026-03-11')
      expect(nextOccurrence(weekly(1, [3]), '2026-03-04', '2026-03-11')).toBe('2026-03-18')
    })

    it('nextOccurrence alcança o maior intervalo suportado', () => {
      expect(nextOccurrence(yearly(10), '2026-03-10', '2026-03-10')).toBe('2036-03-10')
    })
  })
})
