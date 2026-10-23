import { formatDayLabel, formatDayLong, weekdayLabels } from '@/lib/todo/format'

const today = '2026-03-10'

describe('formatDayLabel', () => {
  it('usa palavras para ontem, hoje e amanhã (pt-BR)', () => {
    expect(formatDayLabel('2026-03-09', today, 'pt-BR')).toBe('ontem')
    expect(formatDayLabel('2026-03-10', today, 'pt-BR')).toBe('hoje')
    expect(formatDayLabel('2026-03-11', today, 'pt-BR')).toBe('amanhã')
  })

  it('usa palavras para ontem, hoje e amanhã (en)', () => {
    expect(formatDayLabel('2026-03-09', today, 'en')).toBe('yesterday')
    expect(formatDayLabel('2026-03-10', today, 'en')).toBe('today')
    expect(formatDayLabel('2026-03-11', today, 'en')).toBe('tomorrow')
  })

  it('dentro de uma semana mostra o dia da semana', () => {
    expect(formatDayLabel('2026-03-13', today, 'en')).toBe('Fri, 13 Mar')
    expect(formatDayLabel('2026-03-04', today, 'en')).toBe('Wed, 4 Mar')
  })

  it('mais longe mostra a data, com o ano só se não for o corrente', () => {
    expect(formatDayLabel('2026-04-20', today, 'en')).toBe('20 Apr')
    expect(formatDayLabel('2027-01-05', today, 'en')).toBe('5 Jan 2027')
  })
})

describe('formatDayLong', () => {
  it('escreve a data por extenso no idioma', () => {
    expect(formatDayLong('2026-03-10', 'pt-BR')).toBe('10 de março de 2026')
    expect(formatDayLong('2026-03-10', 'en')).toBe('March 10th, 2026')
  })
})

describe('weekdayLabels', () => {
  it('devolve os sete dias a partir do domingo, curtos e longos', () => {
    const en = weekdayLabels('en')
    expect(en).toHaveLength(7)
    expect([en[0].long, en[3].long, en[6].long]).toEqual(['Sunday', 'Wednesday', 'Saturday'])
    expect(en[1].short).toBe('Mon')
    expect(weekdayLabels('pt-BR')[0].long).toBe('domingo')
  })
})
