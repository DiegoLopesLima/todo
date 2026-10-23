'use client'

import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import { Suspense } from 'react'

import { ServiceWorkerRegistrar } from '@/providers/ServiceWorkerRegistrar'
import { TodoProvider } from '@/providers/TodoProvider'
import { TodoScreen } from './_components/TodoScreen'
import { TodoSkeleton } from './_components/TodoSkeleton'

/**
 * A raiz cliente do app. O `Suspense` é obrigatório: a visão e a busca vivem na URL (`useSearchParams`),
 * e sem o boundary a rota estática inteira viraria renderização de cliente.
 *
 * `MotionConfig reducedMotion="user"` faz todas as animações de movimento respeitarem a preferência
 * do sistema; `domMax` habilita as animações de layout que reposicionam as linhas.
 */
export function TodoApp() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax}>
        <TodoProvider>
          <ServiceWorkerRegistrar />
          <Suspense fallback={<TodoSkeleton />}>
            <TodoScreen />
          </Suspense>
        </TodoProvider>
      </LazyMotion>
    </MotionConfig>
  )
}
