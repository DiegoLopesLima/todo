/** Um atalho global da tela de tarefas. */
export type GlobalShortcut = 'undo' | 'redo' | 'search' | 'newTask' | 'help'

type KeyLike = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'isComposing' | 'target'
>

/** `true` se o alvo é um campo onde a tecla é do campo (digitar, desfazer o texto). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Qual atalho global o evento representa (ou `null`). Desfazer/refazer usam ⌘ no macOS e Ctrl nos
 * demais; refazer é ⇧⌘Z / Ctrl+⇧Z, e também Ctrl+Y fora do macOS. A letra vem de `event.code`
 * (a posição da tecla) para funcionar em layouts não latinos.
 *
 * Por quê: dentro de um campo de texto o desfazer é do próprio campo — e durante a composição de um
 * caractere (IME) nenhuma tecla é um atalho.
 */
export function matchShortcut(event: KeyLike, isMac: boolean): GlobalShortcut | null {
  if (event.isComposing) return null
  const editable = isEditableTarget(event.target)
  const mod = isMac ? event.metaKey : event.ctrlKey

  if (mod && !event.altKey) {
    if (editable) return null
    if (event.code === 'KeyZ') return event.shiftKey ? 'redo' : 'undo'
    if (event.code === 'KeyY' && !isMac && !event.shiftKey) return 'redo'
    return null
  }

  if (editable || event.ctrlKey || event.metaKey || event.altKey) return null
  if (event.key === '/') return 'search'
  if (event.key === 'n') return 'newTask'
  if (event.key === '?') return 'help'
  return null
}
