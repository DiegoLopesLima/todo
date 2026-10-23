'use client'

import { useEffect } from 'react'

import { isMacPlatform } from '@/lib/platform'
import { useTodoUi } from '@/store/todo-ui'
import { QUICK_ADD_INPUT_ID } from '../quick-add/QuickAddBar'
import { SEARCH_INPUT_ID } from '../toolbar/SearchField'
import { matchShortcut } from './shortcuts'
import { useTodoActions } from './useTodoActions'

/**
 * Atalhos globais da tela: desfazer/refazer, `/` busca, `n` nova tarefa, `?` ajuda. Ficam quietos com
 * um diálogo aberto (`modalCount`), enquanto a pessoa digita e durante a composição de um caractere.
 */
export function useTodoShortcuts({ onHelp }: { onHelp: () => void }): void {
  const actions = useTodoActions()

  useEffect(() => {
    const isMac = isMacPlatform()

    const onKeyDown = (event: KeyboardEvent) => {
      if (useTodoUi.getState().modalCount > 0) return
      const shortcut = matchShortcut(event, isMac)
      if (!shortcut) return
      event.preventDefault()
      switch (shortcut) {
        case 'undo':
          actions.undo()
          break
        case 'redo':
          actions.redo()
          break
        case 'search':
          document.getElementById(SEARCH_INPUT_ID)?.focus()
          break
        case 'newTask':
          document.getElementById(QUICK_ADD_INPUT_ID)?.focus()
          break
        case 'help':
          onHelp()
          break
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [actions, onHelp])
}
