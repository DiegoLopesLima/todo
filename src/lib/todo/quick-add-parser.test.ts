import { parseQuickAdd } from '@/lib/todo/quick-add-parser'

describe('parseQuickAdd', () => {
  it('texto simples não tem prioridade', () => {
    expect(parseQuickAdd('  Pagar boleto  ')).toEqual({ text: 'Pagar boleto', priority: null })
  })

  it.each([
    ['!1 Revisar contrato', 'Revisar contrato', 'p1'],
    ['!4 Revisar contrato', 'Revisar contrato', 'p4'],
    ['Revisar contrato !2', 'Revisar contrato', 'p2'],
    ['  Revisar contrato   !3 ', 'Revisar contrato', 'p3'],
  ])('lê o marcador de %j', (input, text, priority) => {
    expect(parseQuickAdd(input)).toEqual({ text, priority })
  })

  it.each(['revisar !2 do contrato', '!5 fora da faixa', '!0 zero', 'grito!2', '!2', 'a!2 b'])(
    'não interpreta %j',
    (input) => {
      expect(parseQuickAdd(input)).toEqual({ text: input.trim(), priority: null })
    }
  )

  it('com marcador nas duas pontas vale o do início, e o do fim fica no texto', () => {
    expect(parseQuickAdd('!1 Ligar !3')).toEqual({ text: 'Ligar !3', priority: 'p1' })
  })

  it('mantém quebras de linha internas', () => {
    expect(parseQuickAdd('!2 linha um\nlinha dois')).toEqual({
      text: 'linha um\nlinha dois',
      priority: 'p2',
    })
  })
})
