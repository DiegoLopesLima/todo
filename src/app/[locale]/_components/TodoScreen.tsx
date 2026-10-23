'use client'

import { useCallback, useState } from 'react'

import { cn } from '@/lib/utils'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoPrefs } from '@/store/todo-prefs'
import { BackupReminder } from './data/BackupReminder'
import { CorruptDataDialog } from './data/CorruptDataDialog'
import { ImportDialog } from './data/ImportDialog'
import { CelebrationLayer } from './feedback/CelebrationLayer'
import { LiveRegion } from './feedback/LiveRegion'
import { ShortcutsDialog } from './feedback/ShortcutsDialog'
import { StatusBanners } from './feedback/StatusBanners'
import { HeaderMenu } from './header/HeaderMenu'
import { TodoHeader } from './header/TodoHeader'
import { HistorySheet } from './history/HistorySheet'
import { PAGE_GUTTER, PAGE_WIDTH, SECTION_GAP } from './layout'
import { TodoList } from './list/TodoList'
import { QuickAddBar } from './quick-add/QuickAddBar'
import { useTodoRows } from './state/useTodoRows'
import { useTodoShortcuts } from './state/useTodoShortcuts'
import { useTodoView } from './state/useTodoView'
import { TodoListSkeleton } from './TodoSkeleton'
import { SearchField } from './toolbar/SearchField'
import { ViewTabs } from './toolbar/ViewTabs'

/**
 * A tela inteira do app: cabeçalho com o progresso, criação rápida, visões + busca e a lista.
 * Mostra o esqueleto até as stores lerem o armazenamento do navegador.
 */
export function TodoScreen() {
  const { view, query, setView, setQuery } = useTodoView()
  const rows = useTodoRows(view, query)
  const documentReady = useTodoDocument((state) => state.hydrated)
  const prefsReady = useTodoPrefs((state) => state.hydrated)
  const hydrated = documentReady && prefsReady
  const [helpOpen, setHelpOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItemId, setHistoryItemId] = useState<string | null>(null)

  const openHistory = useCallback((itemId: string | null) => {
    setHistoryItemId(itemId)
    setHistoryOpen(true)
  }, [])

  const openHelp = useCallback(() => setHelpOpen(true), [])
  useTodoShortcuts({ onHelp: openHelp })

  return (
    <main
      className={cn(
        'flex flex-1 flex-col pt-5 pb-36 sm:pt-8 sm:pb-12 lg:pt-10',
        SECTION_GAP,
        PAGE_WIDTH,
        PAGE_GUTTER
      )}
    >
      <TodoHeader
        actions={
          <HeaderMenu
            onHistory={() => openHistory(null)}
            onImport={() => setImportOpen(true)}
            onHelp={openHelp}
          />
        }
      />
      <StatusBanners />
      <BackupReminder />
      <QuickAddBar />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewTabs view={view} onChange={setView} />
        <SearchField value={query} onChange={setQuery} />
      </div>
      {hydrated ? (
        // Por quê: a lista entra com um fade ao trocar o esqueleto, em vez de um corte seco.
        <div className="motion-safe:fade-in motion-safe:animate-in motion-safe:duration-300">
          <TodoList rows={rows} view={view} query={query} onHistory={openHistory} />
        </div>
      ) : (
        <TodoListSkeleton />
      )}
      <LiveRegion />
      <CelebrationLayer />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        itemId={historyItemId}
        onClearItem={() => setHistoryItemId(null)}
      />
      <CorruptDataDialog />
    </main>
  )
}
