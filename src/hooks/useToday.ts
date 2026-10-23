'use client'

import { useEffect, useState } from 'react'

import { ONE_SECOND_IN_MS } from '@/constants/time'
import { type DateKey, toDateKey } from '@/lib/todo/dates'

/** Quanto depois da meia-noite o relógio "vira" — folga para o timer nunca disparar antes da hora. */
const MIDNIGHT_SLACK_MS = ONE_SECOND_IN_MS

function msUntilNextMidnight(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return nextMidnight.getTime() - now.getTime() + MIDNIGHT_SLACK_MS
}

/**
 * O dia local de hoje, atualizado sozinho: na virada da meia-noite com o app aberto, e ao voltar o
 * foco ou a visibilidade da aba (o computador pode ter dormido e o timer atrasado).
 */
export function useToday(): DateKey {
  const [today, setToday] = useState<DateKey>(() => toDateKey(new Date()))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => setToday(toDateKey(new Date()))
    const schedule = () => {
      timer = setTimeout(() => {
        refresh()
        schedule()
      }, msUntilNextMidnight(new Date()))
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    // Por quê: o 1º valor vem do estado inicial; sincronizar ao montar cobre o intervalo entre a
    // renderização do HTML e a hidratação (que pode cruzar a meia-noite).
    refresh()
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return today
}
