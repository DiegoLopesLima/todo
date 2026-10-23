import { Checkbox } from '@/components/ui/checkbox'
import type { CheckState } from '@/lib/todo/completion'
import { cn } from '@/lib/utils'

/**
 * O checkbox visual da linha. Não recebe clique nem foco: a linha inteira é o alvo e é ela que
 * alterna — este controle só mostra o estado (marcado, vazio ou indeterminado) com o "pulo" de
 * confirmação.
 */
export function RowCheck({ state, className }: { state: CheckState; className?: string }) {
  return (
    <Checkbox
      readOnly
      tabIndex={-1}
      aria-hidden
      checked={state === 'checked'}
      indeterminate={state === 'indeterminate'}
      className={cn(
        'pointer-events-none size-5 shrink-0 rounded-full border-2 [&_svg]:size-3.5',
        'motion-safe:data-checked:animate-check-pop motion-safe:data-indeterminate:animate-check-pop',
        className
      )}
    />
  )
}
