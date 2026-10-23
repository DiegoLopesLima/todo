import { setRequestLocale } from 'next-intl/server'
import { use } from 'react'

import { TodoApp } from './TodoApp'

/** A página inicial é o próprio app de tarefas: sem rota extra, sem login. */
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  setRequestLocale(locale)
  return <TodoApp />
}
