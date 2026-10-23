import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import confetti from 'canvas-confetti'
import { addDays, toDateKey } from '@/lib/todo/dates'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoPrefs } from '@/store/todo-prefs'
import { messages } from '@/test/intl'
import { dailySeries, docWith, doneItem, item, uuid } from '@/test/todo-fixtures'
import { dispatchNow, renderTodoApp, resetTodoStores, seedDocument } from '@/test/todo-ui'

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
  jest.mocked(confetti).mockClear()
})

const row = (name: string | RegExp) => screen.getByRole('treeitem', { name })
const rows = () => screen.queryAllByRole('treeitem')

async function ready() {
  // O esqueleto some quando as stores terminam de hidratar.
  await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
}

describe('TodoApp — lista vazia e criação', () => {
  it('mostra o estado vazio da visão Hoje quando não há tarefas', async () => {
    renderTodoApp()
    expect(await screen.findByText(t.empty.today.title)).toBeInTheDocument()
  })

  it('cria uma tarefa só digitando e apertando Enter, e limpa o campo', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await ready()

    const input = screen.getByLabelText(t.quickAdd.label)
    await user.type(input, 'Pagar boleto{Enter}')

    expect(await screen.findByRole('treeitem', { name: /Pagar boleto/ })).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('lê a prioridade de "!2" no texto e mostra a bandeira', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await ready()

    await user.type(screen.getByLabelText(t.quickAdd.label), '!2 Revisar contrato{Enter}')

    const created = await screen.findByRole('treeitem', { name: /Revisar contrato/ })
    expect(within(created).getByText(t.priority.p2)).toBeInTheDocument()
    expect(Object.values(useTodoDocument.getState().doc.items)[0]).toMatchObject({
      text: 'Revisar contrato',
      priority: 'p2',
    })
  })

  it('não cria com texto só de espaços (o botão fica desabilitado)', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await ready()
    await user.type(screen.getByLabelText(t.quickAdd.label), '   ')
    expect(screen.getByRole('button', { name: t.quickAdd.submit })).toBeDisabled()
  })
})

describe('TodoApp — marcar e desmarcar', () => {
  it('clicar em QUALQUER ponto da linha alterna, não só no checkbox', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Tarefa A' })] }))
    renderTodoApp()

    const target = await screen.findByRole('treeitem', { name: /Tarefa A/ })
    expect(target).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByText('Tarefa A'))
    expect(row(/Tarefa A/)).toHaveAttribute('aria-checked', 'true')

    await user.click(row(/Tarefa A/))
    expect(row(/Tarefa A/)).toHaveAttribute('aria-checked', 'false')
  })

  it('os controles da linha (lápis, menu, chevron) não alternam a tarefa', async () => {
    const user = userEvent.setup()
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Pai' }),
          item({ id: uuid(2), text: 'Filho', parentId: uuid(1) }),
        ],
      })
    )
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Pai/ })

    await user.click(screen.getByRole('button', { name: t.row.menu.replace('{text}', 'Pai') }))
    expect(row(/Pai/)).toHaveAttribute('aria-checked', 'false')

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: t.row.collapse.replace('{text}', 'Pai') }))
    expect(row(/Pai/)).toHaveAttribute('aria-checked', 'false')
  })

  it('selecionar texto não marca a tarefa', async () => {
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Texto selecionável' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Texto selecionável/ })

    const span = screen.getByText('Texto selecionável')
    const range = document.createRange()
    range.selectNodeContents(span)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
    // `fireEvent` e não `user.click`: o user-event colapsa a seleção no mousedown, como o navegador
    // faria num clique simples — aqui queremos o clique que TERMINA uma seleção feita arrastando.
    fireEvent.click(span)

    expect(row(/Texto selecionável/)).toHaveAttribute('aria-checked', 'false')
    window.getSelection()?.removeAllRanges()
  })
})

describe('TodoApp — pais e filhos', () => {
  const family = () =>
    docWith({
      items: [
        item({ id: uuid(1), text: 'Pai' }),
        item({ id: uuid(2), text: 'Filho 1', parentId: uuid(1), rank: 'a0' }),
        item({ id: uuid(3), text: 'Filho 2', parentId: uuid(1), rank: 'a1' }),
        item({ id: uuid(4), text: 'Filho 3', parentId: uuid(1), rank: 'a2' }),
      ],
    })

  it('mostra o pai indeterminado quando só parte dos filhos está marcada', async () => {
    const user = userEvent.setup()
    seedDocument(family())
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Pai/ })

    await user.click(screen.getByText('Filho 1'))

    expect(row(/Pai/)).toHaveAttribute('aria-checked', 'mixed')
    expect(within(row(/Pai/)).getByText('1 de 3')).toBeInTheDocument()
  })

  it('marcar o último filho conclui o pai', async () => {
    const user = userEvent.setup()
    seedDocument(family())
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Pai/ })

    await user.click(screen.getByText('Filho 1'))
    await user.click(screen.getByText('Filho 2'))
    await user.click(screen.getByText('Filho 3'))

    expect(row(/^Pai/)).toHaveAttribute('aria-checked', 'true')
  })

  it('marcar o pai marca todos os filhos, e desmarcar o pai desmarca todos', async () => {
    const user = userEvent.setup()
    seedDocument(family())
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Pai/ })

    await user.click(row(/^Pai/))
    for (const name of [/Filho 1/, /Filho 2/, /Filho 3/]) {
      expect(row(name)).toHaveAttribute('aria-checked', 'true')
    }

    await user.click(row(/^Pai/))
    for (const name of [/^Pai/, /Filho 1/, /Filho 2/, /Filho 3/]) {
      expect(row(name)).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('recolher esconde os filhos', async () => {
    const user = userEvent.setup()
    seedDocument(family())
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Pai/ })
    expect(rows()).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: t.row.collapse.replace('{text}', 'Pai') }))
    expect(rows()).toHaveLength(1)
    expect(row(/Pai/)).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('TodoApp — gamificação', () => {
  it('zerar o dia mostra o progresso completo, conta a sequência e solta confete uma vez', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Última' })] }))
    renderTodoApp()
    expect(
      await screen.findByText(t.progress.count.replace('{done}', '0').replace('{total}', '1'))
    ).toBeInTheDocument()

    await user.click(screen.getByText('Última'))

    expect(await screen.findByText(t.progress.allDone)).toBeInTheDocument()
    expect(screen.getByText('1 dia seguido')).toBeInTheDocument()
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))

    // Reabrir e concluir de novo no mesmo dia não repete a festa.
    await user.click(row(/Última/))
    await user.click(row(/Última/))
    expect(confetti).toHaveBeenCalledTimes(1)
  })

  it('com o confete desligado nas preferências, não solta confete', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Quieta' })] }))
    renderTodoApp()
    await screen.findByText('Quieta')
    useTodoPrefs.getState().setConfetti(false)

    await user.click(screen.getByText('Quieta'))

    expect(await screen.findByText(t.progress.allDone)).toBeInTheDocument()
    expect(confetti).not.toHaveBeenCalled()
  })

  it('concluir um pai inteiro celebra e o anel mostra X de Y só com as folhas', async () => {
    const user = userEvent.setup()
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Pai' }),
          item({ id: uuid(2), text: 'F1', parentId: uuid(1), rank: 'a0' }),
          item({ id: uuid(3), text: 'F2', parentId: uuid(1), rank: 'a1' }),
          item({ id: uuid(4), text: 'Solta', rank: 'a1' }),
        ],
      })
    )
    renderTodoApp()
    await screen.findByText('F1')
    expect(screen.getByText('0 de 3 hoje')).toBeInTheDocument()

    await user.click(row(/^Pai/))
    expect(await screen.findByText('2 de 3 hoje')).toBeInTheDocument()
    await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))
  })
})

describe('TodoApp — desfazer', () => {
  it('Ctrl+Z desfaz o que foi marcado por engano, e Ctrl+Shift+Z refaz', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Oops' })] }))
    renderTodoApp()
    await user.click(await screen.findByText('Oops'))
    expect(row(/Oops/)).toHaveAttribute('aria-checked', 'true')

    await user.keyboard('{Control>}z{/Control}')
    expect(row(/Oops/)).toHaveAttribute('aria-checked', 'false')

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(row(/Oops/)).toHaveAttribute('aria-checked', 'true')
  })

  it('o botão Desfazer faz o mesmo e fica desabilitado quando não há o que desfazer', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Oops' })] }))
    renderTodoApp()
    await user.click(await screen.findByText('Oops'))

    const undo = screen.getByRole('button', { name: t.undo.undo })
    expect(undo).toBeEnabled()
    await user.click(undo)
    expect(row(/Oops/)).toHaveAttribute('aria-checked', 'false')
    expect(undo).toBeDisabled()
  })

  it('dentro de um campo de texto, Ctrl+Z é do campo e não desfaz a lista', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Oops' })] }))
    renderTodoApp()
    await user.click(await screen.findByText('Oops'))

    await user.click(screen.getByLabelText(t.quickAdd.label))
    await user.keyboard('{Control>}z{/Control}')

    expect(row(/Oops/)).toHaveAttribute('aria-checked', 'true')
  })
})

describe('TodoApp — teclado', () => {
  it('as setas movem o foco, Espaço alterna e a lista é uma única parada de Tab', async () => {
    const user = userEvent.setup()
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Um', rank: 'a0' }),
          item({ id: uuid(2), text: 'Dois', rank: 'a1' }),
        ],
      })
    )
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Um/ })

    expect(row(/Um/)).toHaveAttribute('tabindex', '0')
    expect(row(/Dois/)).toHaveAttribute('tabindex', '-1')

    act(() => row(/Um/).focus())
    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(row(/Dois/)).toHaveFocus())

    await user.keyboard(' ')
    expect(row(/Dois/)).toHaveAttribute('aria-checked', 'true')
    expect(row(/Um/)).toHaveAttribute('aria-checked', 'false')
  })

  it('F2 edita o texto e Enter salva', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Antes' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Antes/ })

    act(() => row(/Antes/).focus())
    await user.keyboard('{F2}')
    const editor = await screen.findByLabelText(t.row.editLabel)
    await user.clear(editor)
    await user.type(editor, 'Depois{Enter}')

    expect(await screen.findByRole('treeitem', { name: /Depois/ })).toBeInTheDocument()
    expect(useTodoDocument.getState().doc.items[uuid(1)].text).toBe('Depois')
  })

  it('Esc cancela a edição sem salvar', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Fica' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Fica/ })

    act(() => row(/Fica/).focus())
    await user.keyboard('{F2}')
    const editor = await screen.findByLabelText(t.row.editLabel)
    await user.type(editor, ' mudou{Escape}')

    expect(useTodoDocument.getState().doc.items[uuid(1)].text).toBe('Fica')
    expect(await screen.findByRole('treeitem', { name: /Fica/ })).toBeInTheDocument()
  })

  it('1–4 definem a prioridade e Delete exclui, com opção de desfazer', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Alvo' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Alvo/ })

    act(() => row(/Alvo/).focus())
    await user.keyboard('1')
    expect(useTodoDocument.getState().doc.items[uuid(1)].priority).toBe('p1')

    await user.keyboard('{Delete}')
    expect(useTodoDocument.getState().doc.items[uuid(1)]).toBeUndefined()

    await user.keyboard('{Control>}z{/Control}')
    expect(useTodoDocument.getState().doc.items[uuid(1)]).toBeDefined()
  })

  it('Alt+↓ reordena e Alt+→ indenta', async () => {
    const user = userEvent.setup()
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Um', rank: 'a0' }),
          item({ id: uuid(2), text: 'Dois', rank: 'a1' }),
        ],
      })
    )
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Um/ })

    act(() => row(/Um/).focus())
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await waitFor(() =>
      expect(rows().map((r) => r.textContent)).toEqual([
        expect.stringContaining('Dois'),
        expect.stringContaining('Um'),
      ])
    )

    act(() => row(/Um/).focus())
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')
    expect(useTodoDocument.getState().doc.items[uuid(1)].parentId).toBe(uuid(2))
  })
})

describe('TodoApp — arrastar e soltar', () => {
  const handle = (text: string) => t.row.drag.replace('{text}', text)

  it('cada tarefa aberta tem uma alça de arrastar; a concluída não', async () => {
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Aberta', rank: 'a0' }),
          doneItem({ id: uuid(2), text: 'Feita', rank: 'a1' }, today),
        ],
      })
    )
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Aberta/ })

    expect(screen.getByRole('button', { name: handle('Aberta') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: handle('Feita') })).not.toBeInTheDocument()
  })

  it('a alça é só do mouse/toque: fora da ordem de Tab e sem marcar a tarefa ao clicar', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Aberta' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Aberta/ })

    const grip = screen.getByRole('button', { name: handle('Aberta') })
    expect(grip).toHaveAttribute('tabindex', '-1')
    await user.click(grip)
    expect(row(/Aberta/)).toHaveAttribute('aria-checked', 'false')
  })

  it('durante uma busca não se arrasta (a ordem visível não é a da árvore)', async () => {
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Aberta' })] }))
    renderTodoApp({ searchParams: { q: 'aberta' } })
    await screen.findByRole('treeitem', { name: /Aberta/ })
    expect(screen.queryByRole('button', { name: handle('Aberta') })).not.toBeInTheDocument()
  })
})

describe('TodoApp — visões, busca e recorrência', () => {
  it('Todos mostra o que Hoje esconde (agendado e concluído antes)', async () => {
    const user = userEvent.setup()
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Agora', rank: 'a0' }),
          item({ id: uuid(2), text: 'Depois', rank: 'a1', startsOn: '2999-01-01' }),
          doneItem({ id: uuid(3), text: 'Antiga', rank: 'a2' }, '2000-01-01'),
        ],
      })
    )
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Agora/ })
    expect(rows()).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: t.views.all }))
    await waitFor(() => expect(rows()).toHaveLength(3))

    await user.click(screen.getByRole('tab', { name: t.views.upcoming }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(row(/Depois/)).toBeInTheDocument()
  })

  it('a busca ignora acento e caixa', async () => {
    const user = userEvent.setup()
    seedDocument(
      docWith({
        items: [
          item({ id: uuid(1), text: 'Ação importante', rank: 'a0' }),
          item({ id: uuid(2), text: 'Outra coisa', rank: 'a1' }),
        ],
      })
    )
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Ação/ })

    await user.type(screen.getByLabelText(t.search.label), 'ACAO')
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(row(/Ação/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(t.search.label))
    await user.type(screen.getByLabelText(t.search.label), 'zzz')
    expect(await screen.findByText(t.empty.search.title)).toBeInTheDocument()
  })

  it('um item recorrente gerado aparece com o selo de repetição e a data', async () => {
    seedDocument(docWith({ series: [dailySeries({ id: uuid(500), startsOn: today })] }))
    renderTodoApp()

    const occurrence = await screen.findByRole('treeitem', { name: /Code review/ })
    expect(within(occurrence).getByText(t.row.recurring)).toBeInTheDocument()
    expect(within(occurrence).getByText('hoje')).toBeInTheDocument()
  })

  it('ocorrências atrasadas acumulam, cada uma com a sua data', async () => {
    seedDocument(
      docWith({ series: [dailySeries({ id: uuid(500), startsOn: addDays(today, -2) })] })
    )
    renderTodoApp()
    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.getAllByText(t.row.overdue, { exact: false }).length).toBeGreaterThan(0)
  })

  it('dispatch fora da interface atualiza a lista (a store é a fonte da verdade)', async () => {
    renderTodoApp()
    await ready()
    dispatchNow({ type: 'createItem', text: 'Vinda de fora', parentId: null })
    expect(await screen.findByRole('treeitem', { name: /Vinda de fora/ })).toBeInTheDocument()
  })
})
