'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { useTranslations } from 'next-intl'
import { type KeyboardEvent, useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { TODO_DEFAULT_PRIORITY, TODO_MAX_TEXT_LENGTH } from '@/constants/todo'
import { PRIORITIES, type Priority } from '@/enums/todo'
import { parseQuickAdd } from '@/lib/todo/quick-add-parser'
import { cn } from '@/lib/utils'
import { type QuickAddValues, quickAddSchema } from '@/lib/validations/todo'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoUi } from '@/store/todo-ui'
import { PAGE_WIDTH } from '../layout'
import { useTodoActions } from '../state/useTodoActions'
import { ParentPicker } from './ParentPicker'
import { PriorityMenu } from './PriorityMenu'
import { ScheduleControl } from './ScheduleControl'
import { ScheduleDialog } from './ScheduleDialog'
import { EMPTY_SCHEDULE, type ReturnFocus, type Schedule } from './schedule'

/** O id do campo — os atalhos (`n`) o focam por aqui. */
export const QUICK_ADD_INPUT_ID = 'todo-quick-add'

/** `Alt+1`…`Alt+4` no campo escolhem a prioridade sem tirar a mão do teclado. */
function priorityFromAltKey(event: KeyboardEvent<HTMLInputElement>): Priority | null {
  if (!event.altKey || event.ctrlKey || event.metaKey) return null
  const digit = /^(?:Digit|Numpad)([1-4])$/.exec(event.code)?.[1]
  return digit ? PRIORITIES[Number(digit) - 1] : null
}

/**
 * Criar uma tarefa: digitar e apertar Enter. Tudo cabe numa linha só, dentro do grupo do campo:
 * a prioridade (menu, com Normal já marcada), o "quando e repetição" (abre um modal com o
 * calendário), o "dentro de…" e o botão de adicionar. Até o breakpoint `md` os controles viram só
 * ícones, então a linha cabe até no celular; a barra fica fixa na base da tela (zona do polegar).
 *
 * Atalhos: Enter adiciona; `!1`–`!4` no começo/fim do texto ou Alt+1–4 escolhem a prioridade; Esc
 * limpa (e, com o campo vazio, sai dele); `n` em qualquer lugar foca o campo.
 */
export function QuickAddBar() {
  const t = useTranslations('todo')
  const actions = useTodoActions()
  const today = useTodoUi((state) => state.today)
  const form = useForm<QuickAddValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { text: '' },
  })
  const [parentId, setParentId] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority>(TODO_DEFAULT_PRIORITY)
  const [schedule, setSchedule] = useState<Schedule>(EMPTY_SCHEDULE)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const text = form.watch('text')
  const parsed = useMemo(() => parseQuickAdd(text), [text])
  // Um `!2` digitado manda: o menu mostra a prioridade que será usada, não a que estava marcada.
  const effectivePriority = parsed.priority ?? priority
  // O pai escolhido pode ter sido excluído enquanto a barra continuava aberta.
  const parentExists = useTodoDocument((state) => parentId === null || parentId in state.doc.items)
  const effectiveParent = parentExists ? parentId : null
  // Por quê: quem estava digitando volta para o campo e segue digitando. No toque, com o campo
  // vazio, devolver o foco abriria o teclado sem ninguém ter pedido — ali vale o padrão (o botão).
  const returnFocusTo = useCallback<ReturnFocus>((closeType) => {
    const input = document.getElementById(QUICK_ADD_INPUT_ID)
    if (closeType === 'touch' && input instanceof HTMLInputElement && input.value === '')
      return true
    return input
  }, [])

  const choosePriority = (next: Priority) => {
    // Escolher no menu com um `!2` no texto troca o marcador: senão o texto continuaria mandando.
    if (parsed.priority) form.setValue('text', parsed.text, { shouldDirty: true })
    setPriority(next)
  }

  const submit = form.handleSubmit((values) => {
    const { text: clean, priority: fromText } = parseQuickAdd(values.text)
    const common = { parentId: effectiveParent, priority: fromText ?? priority }
    const created = schedule.rule
      ? actions.createRecurring(clean, {
          ...common,
          rule: schedule.rule,
          startsOn: schedule.startsOn ?? today,
          endsOn: schedule.endsOn,
        })
      : actions.create(clean, { ...common, startsOn: schedule.startsOn, dueOn: schedule.dueOn })
    if (created) {
      form.reset()
      // Cada tarefa começa em Normal e sem data; o pai fica, para encadear vários subitens.
      setPriority(TODO_DEFAULT_PRIORITY)
      setSchedule(EMPTY_SCHEDULE)
      form.setFocus('text')
    }
  })

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    const byKey = priorityFromAltKey(event)
    if (byKey) {
      event.preventDefault()
      choosePriority(byKey)
    } else if (event.key === 'Escape') {
      if (text !== '') {
        event.preventDefault()
        form.reset()
      } else {
        event.currentTarget.blur()
      }
    }
  }

  return (
    <>
      <form
        onSubmit={submit}
        noValidate
        className={cn(
          // Celular: fixa na base, acima do teclado/área segura. Desktop: parte do fluxo da página.
          'fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 backdrop-blur',
          'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none'
        )}
      >
        <div className={PAGE_WIDTH}>
          <InputGroup className="h-11 bg-card">
            <InputGroupAddon>
              <Icon icon="lucide:plus" className="size-4" aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id={QUICK_ADD_INPUT_ID}
              autoComplete="off"
              enterKeyHint="done"
              maxLength={TODO_MAX_TEXT_LENGTH}
              placeholder={t('quickAdd.placeholder')}
              aria-label={t('quickAdd.label')}
              aria-invalid={form.formState.errors.text ? true : undefined}
              aria-keyshortcuts="Enter"
              className="min-w-0 flex-1"
              {...form.register('text')}
              onKeyDown={onKeyDown}
            />
            {text === '' && (
              // A dica "N foca o campo" só aparece com o campo vazio e fora de foco, no desktop.
              <InputGroupAddon
                align="inline-end"
                className="order-1 motion-safe:fade-in motion-safe:animate-in motion-safe:duration-200 max-sm:hidden group-focus-within/input-group:hidden"
              >
                <Kbd aria-hidden>N</Kbd>
              </InputGroupAddon>
            )}
            <InputGroupAddon align="inline-end" className="order-2 gap-0.5 pe-1.5">
              <PriorityMenu
                value={effectivePriority}
                onChange={choosePriority}
                returnFocusTo={returnFocusTo}
              />
              <ScheduleControl value={schedule} onOpen={() => setScheduleOpen(true)} />
              <ParentPicker
                value={effectiveParent}
                onChange={setParentId}
                returnFocusTo={returnFocusTo}
              />
              <Button
                type="submit"
                size="sm"
                disabled={text.trim() === ''}
                aria-label={t('quickAdd.submit')}
                className="ms-0.5 gap-1.5 max-md:px-2"
              >
                <Icon icon="lucide:arrow-up" className="size-4 md:hidden" aria-hidden />
                <span aria-hidden className="max-md:hidden">
                  {t('quickAdd.submit')}
                </span>
                <Kbd aria-hidden className="bg-current/15 text-current max-md:hidden">
                  ↵
                </Kbd>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </form>
      {/* Fora do <form>: o "submit" do modal não pode ser confundido com o de criar a tarefa. */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        value={schedule}
        onApply={setSchedule}
        returnFocusTo={returnFocusTo}
      />
    </>
  )
}
