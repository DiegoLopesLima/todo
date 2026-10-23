import {
  compareSiblings,
  MAX_RANK_LENGTH_BEFORE_REBALANCE,
  needsRebalance,
  rankAtEndOfBand,
  rankBetween,
  rankBySoonestDue,
  rankForDrop,
  rebalanceRanks,
  resolveDropPriority,
} from '@/lib/todo/order'
import { doneItem, item, uuid } from '@/test/todo-fixtures'

const p1 = item({ id: uuid(1), priority: 'p1', rank: 'a5' })
const p2a = item({ id: uuid(2), priority: 'p2', rank: 'a0' })
const p2b = item({ id: uuid(3), priority: 'p2', rank: 'a1' })
const p4 = item({ id: uuid(4), priority: 'p4', rank: 'a0' })

describe('order', () => {
  describe('compareSiblings', () => {
    it('ordena por prioridade antes do rank manual', () => {
      const sorted = [p4, p2b, p1, p2a].sort((x, y) => compareSiblings(x, y))
      expect(sorted.map((x) => x.id)).toEqual([p1.id, p2a.id, p2b.id, p4.id])
    })

    it('abertos antes de concluídos, mesmo com prioridade maior', () => {
      const done = doneItem({ id: uuid(5), priority: 'p1', rank: 'a0' })
      expect(compareSiblings(done, p4)).toBeGreaterThan(0)
    })

    it('desempata por id e devolve 0 para o mesmo item', () => {
      const x = item({ id: uuid(6), rank: 'a0' })
      const y = item({ id: uuid(7), rank: 'a0' })
      expect(compareSiblings(x, y)).toBeLessThan(0)
      expect(compareSiblings(x, x)).toBe(0)
    })

    it('holdOpen trata o item como aberto só na ordenação', () => {
      const done = doneItem({ id: uuid(5), priority: 'p1', rank: 'a0' })
      expect(compareSiblings(done, p4, new Set([done.id]))).toBeLessThan(0)
    })
  })

  describe('rankAtEndOfBand', () => {
    it('vai para o fim da própria faixa, ignorando as outras', () => {
      const rank = rankAtEndOfBand([p1, p2a, p2b, p4], 'p2')
      expect(rank > p2b.rank).toBe(true)
    })

    it('numa faixa vazia começa uma chave nova', () => {
      expect(rankAtEndOfBand([p1], 'p3')).toBe(rankBetween(null, null))
    })
  })

  describe('rankBetween', () => {
    it('gera chave entre os limites', () => {
      const r = rankBetween('a0', 'a1')
      expect(r > 'a0' && r < 'a1').toBe(true)
    })

    it('limites iguais ou invertidos (duplicata de importação) não lançam', () => {
      expect(rankBetween('a1', 'a1') > 'a1').toBe(true)
      expect(rankBetween('a2', 'a1') > 'a2').toBe(true)
    })
  })

  describe('resolveDropPriority', () => {
    it('adota a prioridade comum aos vizinhos', () => {
      expect(resolveDropPriority(p2a, p2b, 'below', 'p4')).toBe('p2')
    })

    it('com prioridades diferentes adota a do vizinho mais perto do ponteiro', () => {
      expect(resolveDropPriority(p1, p2a, 'above', 'p4')).toBe('p1')
      expect(resolveDropPriority(p1, p2a, 'below', 'p4')).toBe('p2')
    })

    it('com um vizinho só adota a dele; sem vizinhos mantém a atual', () => {
      expect(resolveDropPriority(undefined, p2a, 'above', 'p4')).toBe('p2')
      expect(resolveDropPriority(p1, undefined, 'below', 'p4')).toBe('p1')
      expect(resolveDropPriority(undefined, undefined, 'below', 'p3')).toBe('p3')
    })
  })

  describe('rankForDrop', () => {
    it('limita só pelos vizinhos da mesma faixa', () => {
      const r = rankForDrop(p2a, p2b, 'p2')
      expect(r > p2a.rank && r < p2b.rank).toBe(true)
      // vizinho de baixo é de outra faixa: só o de cima limita
      const end = rankForDrop(p2b, p4, 'p2')
      expect(end > p2b.rank).toBe(true)
      // vizinho de cima é de outra faixa: vira o primeiro da faixa
      const start = rankForDrop(p1, p2a, 'p2')
      expect(start < p2a.rank).toBe(true)
    })
  })

  describe('rebalanceamento', () => {
    const long = 'a'.repeat(MAX_RANK_LENGTH_BEFORE_REBALANCE + 1)

    it('needsRebalance detecta rank grande', () => {
      expect(needsRebalance([p1, p2a])).toBe(false)
      expect(needsRebalance([p1, item({ id: uuid(8), rank: long })])).toBe(true)
    })

    it('rebalanceRanks reescreve só a faixa afetada, preservando a ordem', () => {
      const x = item({ id: uuid(8), priority: 'p3', rank: `${long}0` })
      const y = item({ id: uuid(9), priority: 'p3', rank: `${long}1` })
      const changes = rebalanceRanks([p1, x, y])
      expect(Object.keys(changes).sort()).toEqual([x.id, y.id].sort())
      expect(changes[x.id] < changes[y.id]).toBe(true)
      expect(changes[x.id].length).toBeLessThan(MAX_RANK_LENGTH_BEFORE_REBALANCE)
    })

    it('rebalanceRanks não faz nada sem ranks grandes', () => {
      expect(rebalanceRanks([p1, p2a, p2b])).toEqual({})
    })
  })

  describe('rankBySoonestDue', () => {
    it('ordena cada faixa por prazo, sem prazo por último, estável nos empates', () => {
      const late = item({ id: uuid(10), priority: 'p2', rank: 'a0', dueOn: '2026-03-20' })
      const none = item({ id: uuid(11), priority: 'p2', rank: 'a1' })
      const soon = item({ id: uuid(12), priority: 'p2', rank: 'a2', dueOn: '2026-03-12' })
      const same = item({ id: uuid(13), priority: 'p2', rank: 'a3', dueOn: '2026-03-12' })
      const changes = rankBySoonestDue([late, none, soon, same])
      const order = [late, none, soon, same]
        .map((x) => ({ id: x.id, rank: changes[x.id] }))
        .sort((x, y) => (x.rank < y.rank ? -1 : 1))
        .map((x) => x.id)
      expect(order).toEqual([soon.id, same.id, late.id, none.id])
    })

    it('não toca faixa que já está ordenada', () => {
      const first = item({ id: uuid(10), priority: 'p2', rank: 'a0', dueOn: '2026-03-12' })
      const second = item({ id: uuid(11), priority: 'p2', rank: 'a1', dueOn: '2026-03-20' })
      expect(rankBySoonestDue([first, second])).toEqual({})
    })
  })
})
