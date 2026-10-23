/** `true` em macOS e iOS, onde o modificador dos atalhos é ⌘ em vez de Ctrl. */
export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
}

/**
 * O rótulo do modificador principal dos atalhos ("⌘" ou "Ctrl"). Só chame onde o resultado aparece
 * depois da hidratação (tooltip, diálogo): no servidor não há `navigator`, e um texto diferente no
 * 1º render causaria divergência de hidratação.
 */
export function modKeyLabel(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl'
}
