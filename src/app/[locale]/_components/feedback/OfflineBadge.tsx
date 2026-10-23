'use client'

import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'

import { Badge } from '@/components/ui/badge'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Selo discreto "sem conexão": tudo continua funcionando, só avisa que a rede caiu. */
export function OfflineBadge() {
  const t = useTranslations('todo.offline')
  // No servidor e no 1º render assume online, para o HTML estático nunca mostrar o selo.
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
  if (online) return null
  return (
    <Badge
      variant="outline"
      className="gap-1 font-normal text-muted-foreground motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:animate-in motion-safe:duration-300"
    >
      <Icon icon="lucide:cloud-off" className="size-3.5" aria-hidden />
      {t('label')}
    </Badge>
  )
}
