'use client'

import { AnimatePresence, m } from 'motion/react'
import type { ReactNode } from 'react'
import { useMediaQuery } from 'usehooks-ts'

import { SECTION_GAP_PX } from '../layout'

type RevealProps = { show: boolean; children: ReactNode }

/**
 * Mostra/esconde um bloco da coluna principal com a altura animada: ele abre empurrando o que vem
 * abaixo e fecha puxando de volta, em vez de aparecer e sumir de uma vez.
 *
 * Por quê: a coluna usa `gap` entre os blocos, e um bloco recém-montado traria um `gap` inteiro de
 * uma vez. A margem negativa inicial desconta esse espaço, e ela encolhe para 0 junto com a altura.
 */
export function Reveal({ show, children }: RevealProps) {
  const wide = useMediaQuery('(min-width: 640px)', { initializeWithValue: false })
  const hidden = {
    height: 0,
    opacity: 0,
    marginTop: -(wide ? SECTION_GAP_PX.sm : SECTION_GAP_PX.base),
    overflow: 'hidden',
  } as const

  return (
    <AnimatePresence initial={false}>
      {show && (
        <m.div
          key="reveal"
          initial={hidden}
          animate={{
            height: 'auto',
            opacity: 1,
            marginTop: 0,
            // Depois de aberto, o anel de foco dos botões de dentro não pode ser cortado.
            transitionEnd: { overflow: 'visible' },
          }}
          exit={hidden}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
}
