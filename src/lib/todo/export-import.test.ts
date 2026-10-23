import { ONE_DAY_IN_MS } from '@/constants/time'
import {
  TODO_BACKUP_REMINDER_CHANGES,
  TODO_BACKUP_REMINDER_DAYS,
  TODO_EXPORT_APP_ID,
  TODO_EXPORT_SCHEMA_VERSION,
  TODO_IMPORT_MAX_BYTES,
  TODO_MAX_ITEMS,
} from '@/constants/todo'
import { runCommand } from '@/lib/todo/commands'
import {
  buildExport,
  markExported,
  mergeHistory,
  parseImportText,
  planImport,
  serializeExport,
  shouldRemindBackup,
} from '@/lib/todo/export-import'
import { EMPTY_STACKS, pushUndo, toUndoEntry, undoStep } from '@/lib/todo/undo'
import type { ExportFile, HistoryEvent } from '@/lib/validations/todo'
import { dailySeries, docWith, doneItem, item, testCtx, uuid } from '@/test/todo-fixtures'

const ctx = testCtx('2026-03-10')

function fileOf(parts: Parameters<typeof docWith>[0], history?: HistoryEvent[]): ExportFile {
  const exported = buildExport(docWith(parts), ctx)
  return history ? { ...exported, data: { ...exported.data, history } } : exported
}

describe('exportar', () => {
  it('gera um arquivo versionado que volta intacto pelo parse', () => {
    const doc = docWith({
      items: [item({ id: uuid(1), text: 'Olá ação' }), doneItem({ id: uuid(2), rank: 'a1' })],
      series: [dailySeries({ id: uuid(500) })],
      cursors: { [uuid(500)]: '2026-03-10' },
    })
    const file = buildExport(doc, ctx)
    expect(file).toMatchObject({
      app: TODO_EXPORT_APP_ID,
      schemaVersion: TODO_EXPORT_SCHEMA_VERSION,
    })
    const parsed = parseImportText(serializeExport(file))
    expect(parsed).toEqual({ ok: true, file })
  })
})

describe('parseImportText', () => {
  const valid = serializeExport(fileOf({ items: [item({ id: uuid(1) })] }))

  it('aceita um arquivo válido', () => {
    expect(parseImportText(valid).ok).toBe(true)
  })

  it('recusa arquivo grande demais', () => {
    expect(parseImportText('x'.repeat(TODO_IMPORT_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: { code: 'too-large' },
    })
  })

  it('recusa o que não é JSON', () => {
    const result = parseImportText('{ não é json')
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-json' } })
  })

  it.each([
    ['uma lista', '[]'],
    ['um texto', '"oi"'],
    ['outro app', JSON.stringify({ app: 'outro', schemaVersion: 1 })],
    ['sem identificação', JSON.stringify({ items: {} })],
  ])('recusa %s como arquivo de outro app', (_label, text) => {
    expect(parseImportText(text)).toEqual({ ok: false, error: { code: 'wrong-app' } })
  })

  it('recusa uma versão de formato mais nova que a suportada', () => {
    const file = { ...JSON.parse(valid), schemaVersion: TODO_EXPORT_SCHEMA_VERSION + 1 }
    expect(parseImportText(JSON.stringify(file))).toEqual({
      ok: false,
      error: { code: 'unsupported-version' },
    })
  })

  it('aponta o caminho do primeiro dado inválido (ex.: 31 de fevereiro)', () => {
    const file = JSON.parse(valid)
    file.data.items[uuid(1)].dueOn = '2026-02-31'
    const result = parseImportText(JSON.stringify(file))
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-data' } })
    if (!result.ok) expect(result.error.path).toBe(`data.items.${uuid(1)}.dueOn`)
  })

  it('recusa ids perigosos como chave', () => {
    const file = JSON.parse(valid)
    file.data.items.__proto__x = file.data.items[uuid(1)]
    expect(parseImportText(JSON.stringify(file)).ok).toBe(false)
  })

  it('recusa campos obrigatórios ausentes', () => {
    const file = JSON.parse(valid)
    delete file.data.series
    expect(parseImportText(JSON.stringify(file))).toMatchObject({
      ok: false,
      error: { code: 'invalid-data', path: 'data.series' },
    })
  })
})

describe('planImport', () => {
  const current = docWith({
    items: [
      item({ id: uuid(1), text: 'local', updatedAt: '2026-03-05T12:00:00.000Z' }),
      item({ id: uuid(2), text: 'só local', rank: 'a1' }),
    ],
  })

  it('mesclar acrescenta o que falta e mantém o mais recente nos itens dos dois lados', () => {
    const file = fileOf({
      items: [
        item({ id: uuid(1), text: 'do arquivo', updatedAt: '2026-03-08T12:00:00.000Z' }),
        item({ id: uuid(3), text: 'novo', rank: 'a2' }),
      ],
    })
    const plan = planImport(current, file, 'merge', ctx)
    if (!plan.ok) throw new Error('esperava ok')
    expect(plan.merged.items[uuid(1)].text).toBe('do arquivo')
    expect(Object.keys(plan.merged.items).sort()).toEqual([uuid(1), uuid(2), uuid(3)])
    expect(plan.summary).toMatchObject({
      itemsAdded: 1,
      itemsUpdated: 1,
      itemsRemoved: 0,
      itemsTotal: 3,
    })
  })

  it('mesclar mantém a versão local quando ela é mais nova', () => {
    const file = fileOf({
      items: [item({ id: uuid(1), text: 'velho', updatedAt: '2026-01-01T12:00:00.000Z' })],
    })
    const plan = planImport(current, file, 'merge', ctx)
    if (!plan.ok) throw new Error('esperava ok')
    expect(plan.merged.items[uuid(1)].text).toBe('local')
    expect(plan.summary.itemsUpdated).toBe(0)
  })

  it('substituir troca itens e séries pelos do arquivo e conta o que sai', () => {
    const file = fileOf({ items: [item({ id: uuid(9), text: 'único' })] })
    const plan = planImport(current, file, 'replace', ctx)
    if (!plan.ok) throw new Error('esperava ok')
    expect(Object.keys(plan.merged.items)).toEqual([uuid(9)])
    expect(plan.summary).toMatchObject({ itemsAdded: 1, itemsRemoved: 2, itemsTotal: 1 })
  })

  it('mesclar une cursores pelo maior e dias zerados', () => {
    const base = {
      ...current,
      cursors: { [uuid(500)]: '2026-03-09' },
      clearedDays: { '2026-03-01': true as const },
    }
    const file = {
      ...fileOf({ series: [dailySeries({ id: uuid(500) })] }),
    }
    file.data.cursors = { [uuid(500)]: '2026-03-10' }
    file.data.clearedDays = { '2026-03-02': true }
    const plan = planImport(
      { ...base, series: { [uuid(500)]: dailySeries({ id: uuid(500) }) } },
      file,
      'merge',
      ctx
    )
    if (!plan.ok) throw new Error('esperava ok')
    expect(plan.merged.cursors[uuid(500)]).toBe('2026-03-10')
    expect(Object.keys(plan.merged.clearedDays).sort()).toEqual(['2026-03-01', '2026-03-02'])
  })

  it('repara referências quebradas do arquivo em vez de falhar', () => {
    const file = fileOf({ items: [item({ id: uuid(1), parentId: uuid(404) })] })
    const plan = planImport(docWith({}), file, 'replace', ctx)
    if (!plan.ok) throw new Error('esperava ok')
    expect(plan.merged.items[uuid(1)].parentId).toBeNull()
  })

  it('recusa passar do teto de itens', () => {
    const filler = Array.from({ length: TODO_MAX_ITEMS }, (_, i) => item({ id: uuid(10_000 + i) }))
    const file = fileOf({ items: [item({ id: uuid(1) })] })
    expect(planImport(docWith({ items: filler }), file, 'merge', ctx)).toEqual({
      ok: false,
      reason: 'limit',
    })
  })

  it('une os históricos sem repetir eventos', () => {
    const shared: HistoryEvent = {
      id: 'e1',
      at: '2026-03-09T12:00:00.000Z',
      type: 'created',
      itemId: uuid(1),
      itemText: 'a',
      origin: 'user',
    }
    const extra: HistoryEvent = { ...shared, id: 'e2', at: '2026-03-08T12:00:00.000Z' }
    expect(mergeHistory([shared], [shared, extra], ctx).map((e) => e.id)).toEqual(['e2', 'e1'])
  })
})

describe('backup', () => {
  const days = (n: number) => new Date(ctx.now.getTime() - n * ONE_DAY_IN_MS).toISOString()

  it('markExported zera as mudanças, registra o instante e sobe a revisão', () => {
    const doc = { ...docWith({}), rev: 4, meta: { lastExportedAt: null, changesSinceExport: 30 } }
    expect(markExported(doc, ctx)).toMatchObject({
      rev: 5,
      meta: { lastExportedAt: ctx.now.toISOString(), changesSinceExport: 0 },
    })
  })

  it.each([
    [
      'poucas mudanças não lembram',
      { lastExportedAt: null, changesSinceExport: TODO_BACKUP_REMINDER_CHANGES - 1 },
      false,
    ],
    [
      'nunca exportou, com muitas mudanças',
      { lastExportedAt: null, changesSinceExport: TODO_BACKUP_REMINDER_CHANGES },
      true,
    ],
    [
      'exportou há pouco, mesmo com muitas mudanças',
      { lastExportedAt: days(2), changesSinceExport: 500 },
      false,
    ],
    [
      'exportou há tempo e mudou muito',
      {
        lastExportedAt: days(TODO_BACKUP_REMINDER_DAYS),
        changesSinceExport: TODO_BACKUP_REMINDER_CHANGES,
      },
      true,
    ],
    [
      'exportou há tempo, mas mudou pouco',
      { lastExportedAt: days(90), changesSinceExport: 3 },
      false,
    ],
  ])('shouldRemindBackup: %s', (_label, meta, expected) => {
    expect(shouldRemindBackup(meta, ctx)).toBe(expected)
  })
})

describe('importar como comando', () => {
  const file = fileOf({ items: [item({ id: uuid(9), text: 'importado' })] })

  it('registra o evento e é desfeito em um passo, voltando ao que havia', () => {
    const before = docWith({ items: [item({ id: uuid(1), text: 'meu' })] })
    const result = runCommand(before, { type: 'importDocument', mode: 'replace', file }, ctx)
    if (!result.ok) throw new Error(result.reason)
    expect(Object.keys(result.doc.items)).toEqual([uuid(9)])
    expect(result.events[0]).toMatchObject({ type: 'imported', count: 1 })

    const stacks = pushUndo(EMPTY_STACKS, toUndoEntry(result))
    const undone = undoStep(result.doc, stacks, ctx)
    expect(undone?.doc.items).toEqual(before.items)
  })

  it('recusa quando passaria do limite', () => {
    const filler = Array.from({ length: TODO_MAX_ITEMS }, (_, i) => item({ id: uuid(10_000 + i) }))
    const result = runCommand(
      docWith({ items: filler }),
      { type: 'importDocument', mode: 'merge', file },
      ctx
    )
    expect(result).toEqual({ ok: false, reason: 'limit' })
  })
})
