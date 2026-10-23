import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const VIEW_BOX = 44
const STROKE_WIDTH = 4
const RADIUS = (VIEW_BOX - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export type ProgressRingProps = {
  /** Progresso de 0 a 1. */
  value: number
  /** Pinta o anel como concluído (cor de sucesso). */
  complete?: boolean
  /** Conteúdo no centro do anel (um número, um ícone). */
  children?: ReactNode
  /** Tamanho e cor de texto: o anel preenche o espaço que receber (`size-11` por padrão). */
  className?: string
}

/**
 * Anel de progresso animado. É decorativo (`aria-hidden`): quem o usa mostra o mesmo dado em texto.
 * O preenchimento anima por CSS (`transition` no `stroke-dashoffset`), então respeita
 * `prefers-reduced-motion` via `motion-reduce:transition-none`.
 */
export function ProgressRing({ value, complete = false, children, className }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <div className={cn('relative grid size-11 shrink-0 place-items-center', className)} aria-hidden>
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx={VIEW_BOX / 2}
          cy={VIEW_BOX / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          className="fill-none stroke-muted"
        />
        <circle
          cx={VIEW_BOX / 2}
          cy={VIEW_BOX / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          // Por quê: `style` inline é a exceção da regra de "só Tailwind" — o deslocamento é um
          // número contínuo (0–circunferência) que muda a cada conclusão e precisa de transição CSS.
          style={{ strokeDashoffset: CIRCUMFERENCE * (1 - clamped) }}
          className={cn(
            'fill-none transition-[stroke-dashoffset,stroke] duration-700 ease-out motion-reduce:transition-none',
            complete ? 'stroke-success' : 'stroke-primary'
          )}
        />
      </svg>
      {children}
    </div>
  )
}
