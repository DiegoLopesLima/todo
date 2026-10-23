'use client'

import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TODO_VIEWS, type TodoView } from '@/enums/todo'

type ViewTabsProps = { view: TodoView; onChange: (view: TodoView) => void }

/** Hoje / Próximos / Todos. O valor vive na URL (`?v=`), então o botão voltar e os links funcionam. */
export function ViewTabs({ view, onChange }: ViewTabsProps) {
  const t = useTranslations('todo.views')
  return (
    <Tabs
      value={view}
      onValueChange={(next) => onChange(next as TodoView)}
      className="w-full sm:w-auto"
    >
      <TabsList aria-label={t('label')} className="w-full sm:w-auto">
        {TODO_VIEWS.map((option) => (
          <TabsTrigger key={option} value={option} className="flex-1 sm:flex-none sm:px-4">
            {t(option)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
