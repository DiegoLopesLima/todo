'use client'

import { useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { TODO_MAX_TEXT_LENGTH } from '@/constants/todo'

export type InlineEditorProps = {
  initial: string
  /** Nome acessível do campo. */
  label: string
  placeholder?: string
  /** Confirma o texto (Enter ou sair do campo). Devolve `false` se foi recusado e deve continuar aberto. */
  onCommit: (text: string) => boolean | undefined
  /** Esc ou texto vazio sem mudança: fecha sem salvar. */
  onCancel: () => void
  /** Tab / Shift+Tab: confirma o texto e pede para indentar (`1`) ou desindentar (`-1`). */
  onTab?: (direction: 1 | -1, text: string) => void
  /** Depois de confirmar com Enter, mantém o campo aberto e vazio (para adicionar vários seguidos). */
  keepOpen?: boolean
  className?: string
}

/**
 * Campo de texto de uma linha para editar uma tarefa ou digitar um subitem. Enter confirma, Esc
 * cancela, sair do campo confirma. Ignora Enter durante a composição de um caractere (IME).
 */
export function InlineEditor({
  initial,
  label,
  placeholder,
  onCommit,
  onCancel,
  onTab,
  keepOpen = false,
  className,
}: InlineEditorProps) {
  const [value, setValue] = useState(initial)
  // Por quê: Enter confirma e, ao fechar o campo, o navegador pode disparar `blur` no mesmo tick —
  // sem este flag (um ref, que não espera re-render) o texto seria confirmado duas vezes (dois
  // eventos no histórico).
  const settled = useRef(false)

  const commit = () => {
    if (settled.current) return
    const text = value.trim()
    if (text === '' || text === initial) {
      settled.current = true
      onCancel()
      return
    }
    if (onCommit(text) === false) return
    if (keepOpen) {
      setValue('')
      return
    }
    settled.current = true
  }

  return (
    <Input
      autoFocus
      aria-label={label}
      placeholder={placeholder}
      value={value}
      maxLength={TODO_MAX_TEXT_LENGTH}
      className={className}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.stopPropagation()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          settled.current = true
          onCancel()
        } else if (event.key === 'Tab' && onTab) {
          event.preventDefault()
          settled.current = true
          onTab(event.shiftKey ? -1 : 1, value.trim())
        }
      }}
    />
  )
}
