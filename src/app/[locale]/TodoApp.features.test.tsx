import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TODO_BACKUP_REMINDER_CHANGES } from '@/constants/todo'
import { downloadTextFile } from '@/lib/download'
import { buildExport, serializeExport } from '@/lib/todo/export-import'
import { useTodoDocument } from '@/store/todo-document'
import { useTodoUi } from '@/store/todo-ui'
import { messages } from '@/test/intl'
import { docWith, item, testCtx, uuid } from '@/test/todo-fixtures'
import { dispatchNow, renderTodoApp, resetTodoStores, seedDocument } from '@/test/todo-ui'

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/',
}))
jest.mock('canvas-confetti', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('@/lib/download', () => ({
  ...jest.requireActual('@/lib/download'),
  downloadTextFile: jest.fn(),
}))
jest.mock('@/services/storage-persistence', () => ({
  requestPersistentStorage: jest.fn(async () => true),
}))

const t = messages.todo

beforeEach(async () => {
  await resetTodoStores()
  jest.mocked(downloadTextFile).mockClear()
})

const row = (name: string | RegExp) => screen.getByRole('treeitem', { name })

async function openHeaderMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: t.menu.label }))
}

describe('histórico', () => {
  async function seedWithHistory() {
    seedDocument(docWith({}))
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    dispatchNow({ type: 'createItem', text: 'Alvo do histórico', parentId: null })
    const id = Object.keys(useTodoDocument.getState().doc.items)[0]
    dispatchNow({ type: 'toggleDone', id, done: true })
    dispatchNow({ type: 'createItem', text: 'Outra coisa', parentId: null })
  }

  it('lista o que aconteceu, do mais novo para o mais antigo, e mostra o que foi desfeito', async () => {
    const user = userEvent.setup()
    await seedWithHistory()
    act(() => useTodoDocument.getState().undo())

    await openHeaderMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: t.menu.history }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Criou “Alvo do histórico”')).toBeInTheDocument()
    expect(within(dialog).getByText('Concluiu “Alvo do histórico”')).toBeInTheDocument()
    // O que foi desfeito aparece marcado.
    expect(within(dialog).getByText(t.history.undoneBadge)).toBeInTheDocument()
  })

  it('filtra por categoria e por texto', async () => {
    const user = userEvent.setup()
    await seedWithHistory()
    await openHeaderMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: t.menu.history }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: t.history.categories.done }))
    expect(within(dialog).getByText('Concluiu “Alvo do histórico”')).toBeInTheDocument()
    expect(within(dialog).queryByText('Criou “Alvo do histórico”')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: t.history.categories.done }))
    await user.type(within(dialog).getByLabelText(t.history.filters.search), 'outra')
    expect(within(dialog).getByText('Criou “Outra coisa”')).toBeInTheDocument()
    expect(within(dialog).queryByText('Criou “Alvo do histórico”')).not.toBeInTheDocument()
  })

  it('o menu da linha abre só o histórico daquele item', async () => {
    const user = userEvent.setup()
    await seedWithHistory()

    await user.click(
      await screen.findByRole('button', {
        name: t.row.menu.replace('{text}', 'Outra coisa'),
      })
    )
    await user.click(await screen.findByRole('menuitem', { name: t.menu.history }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Criou “Outra coisa”')).toBeInTheDocument()
    expect(within(dialog).queryByText('Criou “Alvo do histórico”')).not.toBeInTheDocument()
  })

  it('sem nada ainda, mostra a mensagem de vazio', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    await openHeaderMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: t.menu.history }))
    expect(await screen.findByText(t.history.empty)).toBeInTheDocument()
  })
})

describe('exportar e importar', () => {
  it('exportar baixa o JSON e zera o contador de mudanças', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Salvar isto' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Salvar isto/ })
    dispatchNow({ type: 'createItem', text: 'mais um', parentId: null })
    expect(useTodoDocument.getState().doc.meta.changesSinceExport).toBeGreaterThan(0)

    await openHeaderMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: t.menu.export }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [filename, content] = jest.mocked(downloadTextFile).mock.calls[0]
    expect(filename).toMatch(/^doable-\d{4}-\d{2}-\d{2}\.json$/)
    expect(JSON.parse(content).data.items[uuid(1)].text).toBe('Salvar isto')
    expect(useTodoDocument.getState().doc.meta.changesSinceExport).toBe(0)
    expect(useTodoDocument.getState().doc.meta.lastExportedAt).not.toBeNull()
  })

  async function openImport(user: ReturnType<typeof userEvent.setup>) {
    await openHeaderMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: t.menu.import }))
    return screen.findByRole('dialog')
  }

  const fileOf = (content: string) =>
    new File([content], 'backup.json', { type: 'application/json' })

  it('mostra o erro de um arquivo que não é JSON', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    const dialog = await openImport(user)

    await user.upload(
      within(dialog).getByLabelText(t.data.import.chooseFile, { selector: 'input' }),
      fileOf('{ nao')
    )

    expect(
      await within(dialog).findByText(t.data.import.errors['invalid-json'])
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: t.data.import.confirm })).toBeDisabled()
  })

  it('aponta onde está o dado inválido', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    const file = buildExport(docWith({ items: [item({ id: uuid(1) })] }), testCtx())
    file.data.items[uuid(1)].dueOn = '2026-02-31'
    const dialog = await openImport(user)

    await user.upload(
      within(dialog).getByLabelText(t.data.import.chooseFile, { selector: 'input' }),
      fileOf(JSON.stringify(file))
    )

    expect(await within(dialog).findByText(`data.items.${uuid(1)}.dueOn`)).toBeInTheDocument()
  })

  it('mostra o resumo, aplica a importação e o Ctrl+Z desfaz', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Já existia' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Já existia/ })
    const incoming = buildExport(
      docWith({ items: [item({ id: uuid(2), text: 'Veio do arquivo' })] }),
      testCtx()
    )
    const dialog = await openImport(user)

    await user.upload(
      within(dialog).getByLabelText(t.data.import.chooseFile, { selector: 'input' }),
      fileOf(serializeExport(incoming))
    )
    // Mesclar: o que existe fica, o novo entra.
    expect(await within(dialog).findByText(t.data.import.summary.total)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: t.data.import.confirm }))

    await waitFor(() => expect(Object.keys(useTodoDocument.getState().doc.items)).toHaveLength(2))
    expect(await screen.findByRole('treeitem', { name: /Veio do arquivo/ })).toBeInTheDocument()

    await user.keyboard('{Control>}z{/Control}')
    await waitFor(() =>
      expect(Object.keys(useTodoDocument.getState().doc.items)).toEqual([uuid(1)])
    )
  })

  it('substituir troca a lista e o resumo mostra o que sai', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Vai embora' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Vai embora/ })
    const incoming = buildExport(
      docWith({ items: [item({ id: uuid(2), text: 'Fica' })] }),
      testCtx()
    )
    const dialog = await openImport(user)
    await user.upload(
      within(dialog).getByLabelText(t.data.import.chooseFile, { selector: 'input' }),
      fileOf(serializeExport(incoming))
    )

    await user.click(
      await within(dialog).findByRole('button', { name: t.data.import.modes.replace })
    )
    expect(within(dialog).getByText(t.data.import.summary.removed)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: t.data.import.confirm }))

    await waitFor(() =>
      expect(Object.keys(useTodoDocument.getState().doc.items)).toEqual([uuid(2)])
    )
  })
})

describe('lembrete de backup, offline e dados ilegíveis', () => {
  it('lembra do backup depois de muitas mudanças sem exportar, e "Depois" esconde', async () => {
    const user = userEvent.setup()
    seedDocument({
      ...docWith({}),
      meta: { lastExportedAt: null, changesSinceExport: TODO_BACKUP_REMINDER_CHANGES },
    })
    renderTodoApp()

    expect(await screen.findByText(t.backup.message)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t.backup.later }))
    // O aviso fecha com uma animação de altura: sai do DOM quando ela termina.
    await waitFor(() => expect(screen.queryByText(t.backup.message)).not.toBeInTheDocument())
  })

  it('o botão do lembrete exporta e o lembrete some', async () => {
    const user = userEvent.setup()
    seedDocument({
      ...docWith({}),
      meta: { lastExportedAt: null, changesSinceExport: TODO_BACKUP_REMINDER_CHANGES },
    })
    renderTodoApp()
    await user.click(await screen.findByRole('button', { name: t.backup.export }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText(t.backup.message)).not.toBeInTheDocument())
  })

  it('não lembra com poucas mudanças', async () => {
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    expect(screen.queryByText(t.backup.message)).not.toBeInTheDocument()
  })

  it('mostra o selo "sem conexão" quando a rede cai', async () => {
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    expect(screen.queryByText(t.offline.label)).not.toBeInTheDocument()

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(await screen.findByText(t.offline.label)).toBeInTheDocument()

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() => expect(screen.queryByText(t.offline.label)).not.toBeInTheDocument())
  })

  it('avisa que os dados salvos eram ilegíveis e oferece baixar a cópia', async () => {
    const user = userEvent.setup()
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))

    act(() => useTodoUi.getState().setCorruptData(true, { quebrado: true }))
    expect(await screen.findByText(t.corrupt.title)).toBeInTheDocument()

    // Confirmação também é tela cheia no celular, com os botões na base.
    const alert = screen.getByRole('alertdialog')
    expect(alert).toHaveClass('max-sm:h-dvh', 'max-sm:rounded-none')
    expect(
      screen
        .getByRole('button', { name: t.corrupt.download })
        .closest('[data-slot="alert-dialog-footer"]')
    ).toHaveClass('max-sm:sticky', 'max-sm:bottom-0')

    await user.click(screen.getByRole('button', { name: t.corrupt.download }))
    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.stringContaining('dados-ilegiveis'),
      expect.stringContaining('quebrado')
    )
  })

  it('avisa quando o navegador não deixa salvar', async () => {
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    act(() => useTodoUi.getState().setPersistError('quota'))
    expect(await screen.findByRole('alert')).toHaveTextContent(t.storage.error.quota)
  })
})

describe('detalhes e repetição', () => {
  it('"d" abre o painel; escolher Diária e salvar transforma a tarefa numa série', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Code review' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Code review/ })

    act(() => row(/Code review/).focus())
    await user.keyboard('d')
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText(t.details.startsOn)).toBeInTheDocument()

    await user.click(within(sheet).getByRole('button', { name: t.recurrence.freq.daily }))
    await user.click(within(sheet).getByRole('button', { name: t.details.save }))

    await waitFor(() => expect(Object.keys(useTodoDocument.getState().doc.series)).toHaveLength(1))
    const [series] = Object.values(useTodoDocument.getState().doc.series)
    expect(series.rule).toEqual({ freq: 'daily', interval: 1 })
    // A tarefa original virou o molde: a ocorrência de hoje a substitui, agora recorrente.
    const occurrence = await screen.findByRole('treeitem', { name: /Code review/ })
    expect(within(occurrence).getByText(t.row.recurring)).toBeInTheDocument()
  })

  it('semanal exige escolher ao menos um dia', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Semanal' })] }))
    renderTodoApp()
    await screen.findByRole('treeitem', { name: /Semanal/ })

    act(() => row(/Semanal/).focus())
    await user.keyboard('d')
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: t.recurrence.freq.weekly }))
    // O dia da semana de hoje vem marcado; desmarcá-lo deixa a lista vazia.
    const pressed = within(sheet)
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-pressed') === 'true' && button.getAttribute('aria-label')
      )
    await user.click(pressed[0])
    await user.click(within(sheet).getByRole('button', { name: t.details.save }))

    expect(
      await within(sheet).findByText(messages.validation.weekdays_required)
    ).toBeInTheDocument()
    expect(Object.keys(useTodoDocument.getState().doc.series)).toHaveLength(0)
  })

  it('o menu da linha abre "Mover para…"', async () => {
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

    await user.click(screen.getByRole('button', { name: t.row.menu.replace('{text}', 'Um') }))
    await user.click(await screen.findByRole('menuitem', { name: t.menu.moveTo }))

    expect(await screen.findByRole('dialog', { name: t.moveTo.title })).toBeInTheDocument()
  })

  it('"Mover para…" abre com o foco na busca e, ao fechar, devolve o foco à linha', async () => {
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

    await user.click(screen.getByRole('button', { name: t.row.menu.replace('{text}', 'Um') }))
    await user.click(await screen.findByRole('menuitem', { name: t.menu.moveTo }))
    const dialog = await screen.findByRole('dialog', { name: t.moveTo.title })
    await waitFor(() => expect(within(dialog).getByRole('combobox')).toHaveFocus())

    await user.keyboard('{Escape}')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /Um/ })).toHaveFocus())
  })

  it('o painel de ajuda de atalhos abre com "?"', async () => {
    renderTodoApp()
    await waitFor(() => expect(useTodoDocument.getState().hydrated).toBe(true))
    fireEvent.keyDown(document.body, { key: '?' })
    expect(await screen.findByText(t.shortcuts.title)).toBeInTheDocument()
  })
})

describe('transições', () => {
  it('uma linha excluída sai da árvore de acessibilidade na hora e do DOM quando a animação termina', async () => {
    const user = userEvent.setup()
    seedDocument(docWith({ items: [item({ id: uuid(1), text: 'Some devagar' })] }))
    renderTodoApp()
    const row = await screen.findByRole('treeitem', { name: /Some devagar/ })
    row.focus()

    await user.keyboard('{Delete}')

    // A linha ainda se desenha enquanto encolhe, mas já está escondida de quem usa leitor de tela.
    await waitFor(() =>
      expect(screen.queryByRole('treeitem', { name: /Some devagar/ })).not.toBeInTheDocument()
    )
    await waitFor(() => expect(document.querySelector('[data-row-id]')).toBeNull(), {
      timeout: 3000,
    })
  })

  it('recolher o pai tira os filhos da árvore de acessibilidade imediatamente', async () => {
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
    await screen.findByRole('treeitem', { name: /Filho/ })

    await user.click(screen.getByRole('button', { name: /Recolher/ }))

    expect(screen.queryByRole('treeitem', { name: /Filho/ })).not.toBeInTheDocument()
  })
})
