'use client'

import { useTodoUi } from '@/store/todo-ui'

/** Região `aria-live` invisível: lê para leitores de tela o que a lista fez ("concluída", "movida"…). */
export function LiveRegion() {
  const announcement = useTodoUi((state) => state.announcement)
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {/* A key muda a cada anúncio, para repetir a mesma frase ser lido de novo. */}
      <span key={announcement?.id ?? 0}>{announcement?.text}</span>
    </div>
  )
}
