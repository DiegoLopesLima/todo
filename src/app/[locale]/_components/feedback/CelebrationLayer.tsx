'use client'

import { useReducedMotion } from 'motion/react'
import { useEffect } from 'react'

import { useTodoPrefs } from '@/store/todo-prefs'
import { useTodoUi } from '@/store/todo-ui'

const PARENT_BURST = { particleCount: 40, spread: 55, startVelocity: 28, ticks: 120 } as const
const DAY_BURST_COUNT = 150
const DAY_BURST_SPREAD = 100

/** Onde, na janela (0–1), fica a linha do item — de onde o confete de "pai concluído" sai. */
function originOfRow(itemId: string | null): { x: number; y: number } | undefined {
  if (!itemId) return undefined
  for (const node of document.querySelectorAll<HTMLElement>('[data-row-id]')) {
    if (node.dataset.rowId !== itemId) continue
    const rect = node.getBoundingClientRect()
    return {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    }
  }
  return undefined
}

/**
 * Dispara o confete das celebrações (pai concluído, dia zerado). Respeita `prefers-reduced-motion`
 * e a preferência de confete. A biblioteca é carregada sob demanda e pré-carregada em tempo ocioso,
 * para a primeira celebração não esperar rede (nem falhar offline).
 */
export function CelebrationLayer() {
  const celebration = useTodoUi((state) => state.celebration)
  const confettiEnabled = useTodoPrefs((state) => state.confetti)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const idle =
      window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 2000))
    idle(() => void import('canvas-confetti'))
  }, [])

  useEffect(() => {
    if (!celebration || !confettiEnabled || reducedMotion) return
    let cancelled = false
    void import('canvas-confetti')
      .then(({ default: confetti }) => {
        if (cancelled) return
        if (celebration.kind === 'day') {
          confetti({
            particleCount: DAY_BURST_COUNT,
            spread: DAY_BURST_SPREAD,
            origin: { y: 0.3 },
            disableForReducedMotion: true,
          })
        } else {
          confetti({
            ...PARENT_BURST,
            origin: originOfRow(celebration.itemId) ?? { y: 0.5 },
            disableForReducedMotion: true,
          })
        }
      })
      // O confete é enfeite: se a biblioteca não carregar (offline sem cache), a celebração some em silêncio.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [celebration, confettiEnabled, reducedMotion])

  return null
}
