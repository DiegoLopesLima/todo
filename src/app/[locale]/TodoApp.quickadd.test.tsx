import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { addDays, toDateKey } from '@/lib/todo/dates'
import { useTodoDocument } from '@/store/todo-document'
import { messages } from '@/test/intl'
import { docWith, item, uuid } from '@/test/todo-fixtures'
import { renderTodoApp, resetTodoStores, seedDocument } from '@/test/todo-ui'

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/',
}))
jest.mock('canvas-confetti', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('@/services/storage-persistence', () => ({
  requestPersistentStorage: jest.fn(async () => true),
}))

const t = messages.todo
const today = toDateKey(new Date())

beforeEach(async () => {
  await resetTodoStores()
})

const items = () => Object.values(useTodoDocument.getState().doc.items)
const input = () => screen.getByLabelText(t.quickAdd.label)
const group = () => input().closest('[data-slot="input-group"]') as HTMLElement
const priorityTrigger = (name: string) =>
  within(group()).getByRole('button', { name: t.quickAdd.priorityAria.replace('{name}', name) })

async function ready() {
  renderTodoApp()
  await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
}

/** Abre o menu de prioridade e escolhe uma. */
async function choosePriority(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.click(priorityTrigger(from))
  await user.click(await screen.findByRole('menuitemradio', { name: new RegExp(`^${to}`) }))
}

describe('criação — prioridade num menu dentro do campo', () => {
  it('tudo mora no grupo do campo, em uma linha, e a prioridade Normal já vem marcada', async () => {
    const user = userEvent.setup()
    await ready()

    expect(group()).toContainElement(priorityTrigger(t.priority.p4))
    expect(group()).toContainElement(screen.getByRole('button', { name: t.schedule.label }))
    expect(group()).toContainElement(screen.getByRole('combobox', { name: /^Dentro de:/ }))
    expect(group()).toContainElement(screen.getByRole('button', { name: t.quickAdd.submit }))
    // Não há mais uma fileira de botões de prioridade ocupando espaço: é um menu.
    expect(screen.queryByRole('group', { name: t.priority.label })).not.toBeInTheDocument()

    await user.click(priorityTrigger(t.priority.p4))
    expect(await screen.findByRole('menuitemradio', { name: /^Normal/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('escolher no menu vale para a próxima tarefa, que depois volta para Normal', async () => {
    const user = userEvent.setup()
    await ready()

    await choosePriority(user, t.priority.p4, t.priority.p2)
    expect(priorityTrigger(t.priority.p2)).toBeInTheDocument()
    // O foco volta para o campo: dá para seguir digitando.
    await waitFor(() => expect(input()).toHaveFocus())

    await user.type(input(), 'Importante{Enter}')
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(items()[0]).toMatchObject({ text: 'Importante', priority: 'p2' })
    expect(priorityTrigger(t.priority.p4)).toBeInTheDocument()

    await user.type(input(), 'Comum{Enter}')
    await waitFor(() => expect(items()).toHaveLength(2))
    expect(items().find((i) => i.text === 'Comum')?.priority).toBe('p4')
  })

  it('"!1" no texto muda a prioridade mostrada, e escolher outra no menu troca o marcador', async () => {
    const user = userEvent.setup()
    await ready()

    await user.type(input(), '!1 Apagar incêndio')
    expect(priorityTrigger(t.priority.p1)).toBeInTheDocument()

    await choosePriority(user, t.priority.p1, t.priority.p3)
    expect(input()).toHaveValue('Apagar incêndio')
    expect(priorityTrigger(t.priority.p3)).toBeInTheDocument()

    await user.type(input(), '{Enter}')
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(items()[0]).toMatchObject({ text: 'Apagar incêndio', priority: 'p3' })
  })

  it('Alt+1…4 escolhem a prioridade sem sair do teclado', async () => {
    const user = userEvent.setup()
    await ready()
    await user.click(input())

    await user.keyboard('{Alt>}3{/Alt}')
    expect(priorityTrigger(t.priority.p3)).toBeInTheDocument()
    await user.keyboard('{Alt>}1{/Alt}')
    expect(priorityTrigger(t.priority.p1)).toBeInTheDocument()
  })
})

describe('criação — quando e repetição', () => {
  const scheduleButton = () =>
    screen.getByRole('button', { name: new RegExp(`^${t.schedule.label}`) })

  async function openSchedule(user: ReturnType<typeof userEvent.setup>) {
    await user.click(scheduleButton())
    return screen.findByRole('dialog')
  }

  it('o botão abre um modal com as datas e a repetição', async () => {
    const user = userEvent.setup()
    await ready()
    const dialog = await openSchedule(user)

    expect(within(dialog).getByText(t.details.startsOn)).toBeInTheDocument()
    expect(within(dialog).getByText(t.details.dueOn)).toBeInTheDocument()
    for (const name of Object.values(t.recurrence.freq)) {
      expect(within(dialog).getByRole('button', { name })).toBeInTheDocument()
    }
    // Sem nada escolhido ainda, não há o que limpar.
    expect(within(dialog).queryByRole('button', { name: t.schedule.clear })).not.toBeInTheDocument()
  })

  it('no celular o modal ocupa a tela toda e o rodapé gruda na base', async () => {
    const user = userEvent.setup()
    await ready()
    const dialog = await openSchedule(user)

    // O jsdom não avalia media queries: confere que o modal carrega as classes do celular.
    expect(dialog).toHaveClass('max-sm:h-dvh', 'max-sm:rounded-none', 'max-sm:max-w-none')
    const footer = within(dialog)
      .getByRole('button', { name: t.schedule.apply })
      .closest('[data-slot="dialog-footer"]')
    expect(footer).toHaveClass('max-sm:sticky', 'max-sm:bottom-0')
  })

  it('escolher "Diária" e aplicar mostra o resumo no botão e cria uma tarefa que se repete', async () => {
    const user = userEvent.setup()
    await ready()
    const dialog = await openSchedule(user)

    await user.click(within(dialog).getByRole('button', { name: t.recurrence.freq.daily }))
    // Numa repetição não há prazo.
    expect(within(dialog).queryByText(t.details.dueOn)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: t.schedule.apply }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(scheduleButton()).toHaveAccessibleName(`${t.schedule.label}: Todo dia`)

    await user.type(input(), 'Code review{Enter}')
    await waitFor(() => expect(Object.keys(useTodoDocument.getState().doc.series)).toHaveLength(1))
    const [series] = Object.values(useTodoDocument.getState().doc.series)
    expect(series).toMatchObject({ rule: { freq: 'daily', interval: 1 }, startsOn: today })
    expect(items().some((i) => i.text === 'Code review' && i.seriesId === series.id)).toBe(true)
    // Depois de criar, o agendamento é limpo.
    expect(scheduleButton()).toHaveAccessibleName(t.schedule.label)
  })

  it('um prazo escolhido no calendário vai para a tarefa criada', async () => {
    const user = userEvent.setup()
    await ready()
    const dialog = await openSchedule(user)

    await user.click(within(dialog).getByLabelText(t.details.dueOn))
    await user.click(await screen.findByRole('button', { name: t.details.tomorrow }))
    await user.click(within(dialog).getByRole('button', { name: t.schedule.apply }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(scheduleButton()).toHaveAccessibleName(`${t.schedule.label}: Prazo amanhã`)

    await user.type(input(), 'Entregar relatório{Enter}')
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(items()[0]).toMatchObject({
      text: 'Entregar relatório',
      dueOn: addDays(today, 1),
      seriesId: null,
    })
  })

  it('aplicar no modal NÃO cria a tarefa nem apaga o que já foi digitado', async () => {
    const user = userEvent.setup()
    await ready()
    await user.type(input(), 'ainda digitando')
    const dialog = await openSchedule(user)

    await user.click(within(dialog).getByRole('button', { name: t.recurrence.freq.weekly }))
    await user.click(within(dialog).getByRole('button', { name: t.schedule.apply }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(items()).toHaveLength(0)
    expect(input()).toHaveValue('ainda digitando')
    await waitFor(() => expect(input()).toHaveFocus())
  })

  it('cancelar descarta, e "Limpar tudo" remove o que estava escolhido', async () => {
    const user = userEvent.setup()
    await ready()
    let dialog = await openSchedule(user)
    await user.click(within(dialog).getByRole('button', { name: t.recurrence.freq.monthly }))
    await user.click(within(dialog).getByRole('button', { name: messages.common.cancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(scheduleButton()).toHaveAccessibleName(t.schedule.label)

    dialog = await openSchedule(user)
    await user.click(within(dialog).getByRole('button', { name: t.recurrence.freq.yearly }))
    await user.click(within(dialog).getByRole('button', { name: t.schedule.apply }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(scheduleButton()).toHaveAccessibleName(`${t.schedule.label}: Todo ano`)

    dialog = await openSchedule(user)
    await user.click(within(dialog).getByRole('button', { name: t.schedule.clear }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(scheduleButton()).toHaveAccessibleName(t.schedule.label)
  })

  it('semanal sem nenhum dia mostra o erro e não aplica', async () => {
    const user = userEvent.setup()
    await ready()
    const dialog = await openSchedule(user)
    await user.click(within(dialog).getByRole('button', { name: t.recurrence.freq.weekly }))
    // Desmarca o dia que já vem marcado.
    const marked = within(dialog)
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-pressed') === 'true' && button.getAttribute('aria-label')
      )
    await user.click(marked[0])
    await user.click(within(dialog).getByRole('button', { name: t.schedule.apply }))

    expect(
      await within(dialog).findByText(messages.validation.weekdays_required)
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('criação — teclado e atalhos exibidos', () => {
  it('Esc limpa o texto e, com o campo vazio, sai do campo', async () => {
    const user = userEvent.setup()
    await ready()

    await user.type(input(), 'rascunho')
    await user.keyboard('{Escape}')
    expect(input()).toHaveValue('')
    expect(input()).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(input()).not.toHaveFocus()
  })

  it('o botão de adicionar mostra a tecla Enter e a dica "N" some quando se digita', async () => {
    const user = userEvent.setup()
    await ready()
    const submit = screen.getByRole('button', { name: t.quickAdd.submit })

    expect(within(submit).getByText('↵')).toBeInTheDocument()
    expect(within(group()).getByText('N')).toBeInTheDocument()

    await user.type(input(), 'x')
    expect(within(group()).queryByText('N')).not.toBeInTheDocument()
  })

  it('o campo de busca avisa que "/" o foca', async () => {
    await ready()
    const search = screen.getByLabelText(t.search.label).closest('[data-slot="input-group"]')
    expect(within(search as HTMLElement).getByText('/')).toBeInTheDocument()
  })

  it('os tooltips mostram os atalhos (desfazer e prioridade)', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'a' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /a/ })
    await user.click(screen.getByText('a'))

    await user.hover(screen.getByRole('button', { name: t.undo.undo }))
    // O tooltip do Base UI abre depois de um pequeno atraso.
    expect(await screen.findByText('Z', {}, { timeout: 3000 })).toBeInTheDocument()

    await user.hover(priorityTrigger(t.priority.p4))
    expect(await screen.findByText('1–4', {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('as opções do menu de prioridade mostram o marcador de texto (!1…!4)', async () => {
    const user = userEvent.setup()
    await ready()
    await user.click(priorityTrigger(t.priority.p4))
    const urgent = await screen.findByRole('menuitemradio', { name: /^Urgente/ })
    expect(within(urgent).getByText('!1')).toBeInTheDocument()
  })
})

describe('criação — dentro de outro item', () => {
  it('escolher um pai cria o item dentro dele e mantém o pai para o próximo', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Projeto' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Projeto/ })

    await user.click(screen.getByRole('combobox', { name: /^Dentro de:/ }))
    await user.click(await screen.findByRole('option', { name: 'Projeto' }))
    expect(await screen.findByRole('combobox', { name: 'Dentro de: Projeto' })).toBeInTheDocument()
    await waitFor(() => expect(input()).toHaveFocus())

    await user.type(input(), 'Passo 1{Enter}')
    await user.type(input(), 'Passo 2{Enter}')

    await waitFor(() => expect(items()).toHaveLength(3))
    const created = items().filter((i) => i.text.startsWith('Passo'))
    expect(created.map((i) => i.parentId)).toEqual([uuid(1), uuid(1)])
  })

  it('"Nenhum" volta a criar no primeiro nível', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Projeto' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Projeto/ })

    await user.click(screen.getByRole('combobox', { name: /^Dentro de:/ }))
    await user.click(await screen.findByRole('option', { name: 'Projeto' }))
    await user.click(screen.getByRole('combobox', { name: 'Dentro de: Projeto' }))
    await user.click(await screen.findByRole('option', { name: t.quickAdd.noParent }))

    await user.type(input(), 'Solta{Enter}')
    await waitFor(() => expect(items()).toHaveLength(2))
    expect(items().find((i) => i.text === 'Solta')?.parentId).toBeNull()
  })
})
