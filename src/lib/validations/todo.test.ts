import { TODO_EXPORT_APP_ID, TODO_MAX_TEXT_LENGTH } from '@/constants/todo'
import {
  blueprintSchema,
  dateKeySchema,
  exportFileSchema,
  itemIdSchema,
  itemSchema,
  quickAddSchema,
  recurrenceSchema,
  seriesSchema,
  todoDocumentSchema,
} from '@/lib/validations/todo'
import { dailySeries, doneItem, emptyDoc, item, uuid } from '@/test/todo-fixtures'

const ok = (schema: { safeParse: (value: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success

describe('todo validations', () => {
  describe('dateKeySchema', () => {
    it('aceita dia real e rejeita 31/02', () => {
      expect(ok(dateKeySchema, '2026-03-10')).toBe(true)
      expect(ok(dateKeySchema, '2026-02-31')).toBe(false)
      expect(ok(dateKeySchema, '10/03/2026')).toBe(false)
    })
  })

  describe('itemIdSchema', () => {
    it('aceita UUID e ocorrência, e barra nomes perigosos', () => {
      expect(ok(itemIdSchema, uuid(1))).toBe(true)
      expect(ok(itemIdSchema, `${uuid(1)}:2026-03-10:3`)).toBe(true)
      expect(ok(itemIdSchema, '__proto__')).toBe(false)
      expect(ok(itemIdSchema, 'constructor')).toBe(false)
    })
  })

  describe('itemSchema', () => {
    it('aceita um item válido, aberto ou concluído', () => {
      expect(ok(itemSchema, item({ id: uuid(1) }))).toBe(true)
      expect(ok(itemSchema, doneItem({ id: uuid(1) }))).toBe(true)
    })

    it('rejeita texto vazio ou grande demais', () => {
      expect(ok(itemSchema, item({ id: uuid(1), text: '   ' }))).toBe(false)
      expect(
        ok(itemSchema, item({ id: uuid(1), text: 'x'.repeat(TODO_MAX_TEXT_LENGTH + 1) }))
      ).toBe(false)
    })

    it('rejeita início depois do prazo', () => {
      const bad = item({ id: uuid(1), startsOn: '2026-03-12', dueOn: '2026-03-10' })
      expect(ok(itemSchema, bad)).toBe(false)
      expect(ok(itemSchema, { ...bad, startsOn: '2026-03-10', dueOn: '2026-03-10' })).toBe(true)
    })

    it('exige seriesId e occurrenceOn juntos', () => {
      expect(ok(itemSchema, item({ id: uuid(1), seriesId: uuid(2) }))).toBe(false)
      expect(ok(itemSchema, item({ id: uuid(1), occurrenceOn: '2026-03-10' }))).toBe(false)
      expect(
        ok(itemSchema, item({ id: uuid(1), seriesId: uuid(2), occurrenceOn: '2026-03-10' }))
      ).toBe(true)
    })

    it('done tem de bater com completedAt/completedOn', () => {
      expect(ok(itemSchema, item({ id: uuid(1), done: true }))).toBe(false)
      expect(ok(itemSchema, doneItem({ id: uuid(1), completedAt: null }))).toBe(false)
    })
  })

  describe('recurrenceSchema', () => {
    it.each([
      { freq: 'daily', interval: 1 },
      { freq: 'weekly', interval: 2, weekdays: [1, 3], weekStartsOn: 0 },
      { freq: 'monthly', interval: 1, day: 'last' },
      { freq: 'monthly', interval: 1, day: 31 },
      { freq: 'yearly', interval: 10 },
    ])('aceita %j', (rule) => {
      expect(ok(recurrenceSchema, rule)).toBe(true)
    })

    it.each([
      { freq: 'daily', interval: 0 },
      { freq: 'daily', interval: 366 },
      { freq: 'weekly', interval: 1, weekdays: [], weekStartsOn: 0 },
      { freq: 'weekly', interval: 1, weekdays: [1, 1], weekStartsOn: 0 },
      { freq: 'weekly', interval: 1, weekdays: [7], weekStartsOn: 0 },
      { freq: 'monthly', interval: 1, day: 32 },
      { freq: 'monthly', interval: 1, day: 0 },
      { freq: 'yearly', interval: 11 },
      { freq: 'hourly', interval: 1 },
    ])('rejeita %j', (rule) => {
      expect(ok(recurrenceSchema, rule)).toBe(false)
    })
  })

  describe('seriesSchema e blueprintSchema', () => {
    it('aceita um molde recursivo', () => {
      const blueprint = {
        text: 'Deploy',
        priority: 'p1',
        children: [
          {
            text: 'Build',
            priority: 'p4',
            children: [{ text: 'Cache', priority: 'p4', children: [] }],
          },
        ],
      }
      expect(ok(blueprintSchema, blueprint)).toBe(true)
      expect(
        ok(blueprintSchema, {
          ...blueprint,
          children: [{ text: '', priority: 'p4', children: [] }],
        })
      ).toBe(false)
    })

    it('rejeita fim antes do início', () => {
      expect(ok(seriesSchema, dailySeries({ id: uuid(1) }))).toBe(true)
      expect(
        ok(seriesSchema, dailySeries({ id: uuid(1), startsOn: '2026-03-10', endsOn: '2026-03-01' }))
      ).toBe(false)
    })
  })

  describe('documento e arquivo de exportação', () => {
    it('o documento vazio é válido', () => {
      expect(ok(todoDocumentSchema, emptyDoc())).toBe(true)
    })

    it('rejeita chave de item que não é id válido', () => {
      const doc = { ...emptyDoc(), items: { __proto__x: item({ id: uuid(1) }) } }
      expect(ok(todoDocumentSchema, doc)).toBe(false)
    })

    it('valida o envelope do arquivo exportado', () => {
      const file = {
        app: TODO_EXPORT_APP_ID,
        schemaVersion: 1,
        exportedAt: '2026-03-10T12:00:00.000Z',
        data: { items: {}, series: {}, cursors: {}, clearedDays: {} },
      }
      expect(ok(exportFileSchema, file)).toBe(true)
      expect(ok(exportFileSchema, { ...file, app: 'outro' })).toBe(false)
      expect(ok(exportFileSchema, { ...file, schemaVersion: 0 })).toBe(false)
      expect(ok(exportFileSchema, { ...file, data: { items: {} } })).toBe(false)
    })
  })

  describe('quickAddSchema', () => {
    it('apara e exige texto', () => {
      const parsed = quickAddSchema.safeParse({ text: '  Pagar boleto ' })
      expect(parsed.success && parsed.data.text).toBe('Pagar boleto')
      expect(ok(quickAddSchema, { text: '   ' })).toBe(false)
    })
  })
})
