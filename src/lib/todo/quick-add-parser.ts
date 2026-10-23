import type { Priority } from '@/enums/todo'

/** O que o campo de criação rápida entendeu do texto digitado. */
export type QuickAddParse = {
  /** O texto sem o marcador de prioridade. */
  text: string
  /** Prioridade escolhida por `!1`…`!4`, se houver. */
  priority: Priority | null
}

// `[\s\S]` em vez de `.` + flag `s`: o target do tsconfig é anterior ao es2018.
const LEADING = /^!([1-4])\s+([\s\S]+)$/
const TRAILING = /^([\s\S]+?)\s+!([1-4])$/

/**
 * Lê `!1`…`!4` no INÍCIO ou no FIM do texto, separado por espaço. Um marcador no meio ("revisar !2 do
 * contrato") ou o texto que seria só o marcador não são interpretados.
 *
 * Por quê: `p1` colidiria com texto comum ("revisar p2 do contrato"); `!` isolado quase nunca aparece
 * no texto de uma tarefa.
 */
export function parseQuickAdd(input: string): QuickAddParse {
  const text = input.trim()
  const leading = LEADING.exec(text)
  if (leading) return { text: leading[2].trim(), priority: `p${leading[1]}` as Priority }
  const trailing = TRAILING.exec(text)
  if (trailing) return { text: trailing[1].trim(), priority: `p${trailing[2]}` as Priority }
  return { text, priority: null }
}
