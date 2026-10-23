import { z } from 'zod'
import { create } from 'zustand'
import { type PersistStorage, persist } from 'zustand/middleware'

import { TODO_IDB_DOC_KEY, TODO_PERSIST_VERSION } from '@/constants/todo-storage'
import {
  type Command,
  type MaterializeRun,
  type RunResult,
  runCommand,
  runMaterialize,
} from '@/lib/todo/commands'
import { type Ctx, makeCtx } from '@/lib/todo/ctx'
import { markExported } from '@/lib/todo/export-import'
import { repairDocument } from '@/lib/todo/integrity'
import { migratePersisted } from '@/lib/todo/migrate'
import {
  EMPTY_STACKS,
  pushUndo,
  redoStep,
  toUndoEntry,
  type UndoEntry,
  type UndoStacks,
  undoStep,
} from '@/lib/todo/undo'
import { type TodoDocument, todoDocumentSchema } from '@/lib/validations/todo'
import { createIdbStorage } from '@/services/todo-storage'
import { createTodoSync } from '@/services/todo-sync'
import { useTodoUi } from '@/store/todo-ui'

/** O que é persistido: só o documento. Pilhas de desfazer e flags de UI ficam de fora. */
export type PersistedTodo = { doc: TodoDocument }

const persistedSchema = z.object({ doc: todoDocumentSchema })

export type TodoDocumentState = {
  doc: TodoDocument
  stacks: UndoStacks
  /** O documento já foi lido do armazenamento. Até lá a interface mostra o esqueleto. */
  hydrated: boolean
  /** O único jeito de mudar a lista: executa o comando, guarda o passo de desfazer e persiste. */
  dispatch: (command: Command) => RunResult
  /** Desfaz o último passo; devolve-o (para o aviso) ou `null` se não havia. */
  undo: () => UndoEntry | null
  redo: () => UndoEntry | null
  /** Gera as ocorrências devidas até hoje (não entra no desfazer). */
  materialize: () => MaterializeRun
  /** Registra que a pessoa acabou de exportar (zera o lembrete de backup). Não entra no desfazer. */
  markExported: () => void
}

export function emptyTodoDocument(): TodoDocument {
  return {
    items: {},
    series: {},
    cursors: {},
    clearedDays: {},
    history: [],
    rev: 0,
    meta: { lastExportedAt: null, changesSinceExport: 0 },
  }
}

export type TodoDocumentDeps = {
  /** Storage do `persist`; em produção é o IndexedDB (ver `todoDocumentStorage`). */
  storage: PersistStorage<PersistedTodo>
  /** Relógio e ids; os testes injetam um determinístico. */
  getCtx?: () => Ctx
}

/**
 * Cria a store do documento de tarefas. É a fonte da verdade: nada grava no armazenamento a não ser
 * o `persist` desta store, e nada altera a lista a não ser `dispatch`.
 *
 * @see useTodoDocument — a instância do app
 */
export function createTodoDocumentStore({ storage, getCtx = makeCtx }: TodoDocumentDeps) {
  const store = create<TodoDocumentState>()(
    persist(
      (set, get) => ({
        doc: emptyTodoDocument(),
        stacks: EMPTY_STACKS,
        hydrated: false,

        dispatch: (command) => {
          if (!get().hydrated) return { ok: false, reason: 'not-ready' }
          const { doc, stacks } = get()
          const result = runCommand(doc, command, getCtx())
          if (result.ok) set({ doc: result.doc, stacks: pushUndo(stacks, toUndoEntry(result)) })
          return result
        },

        undo: () => {
          const { doc, stacks } = get()
          const step = undoStep(doc, stacks, getCtx())
          if (!step) return null
          set({ doc: step.doc, stacks: step.stacks })
          return step.entry
        },

        redo: () => {
          const { doc, stacks } = get()
          const step = redoStep(doc, stacks, getCtx())
          if (!step) return null
          set({ doc: step.doc, stacks: step.stacks })
          return step.entry
        },

        materialize: () => {
          const run = runMaterialize(get().doc, getCtx())
          if (run.changed) set({ doc: run.doc })
          return run
        },

        markExported: () => set({ doc: markExported(get().doc, getCtx()) }),
      }),
      {
        name: TODO_IDB_DOC_KEY,
        version: TODO_PERSIST_VERSION,
        storage,
        // Por quê: hidratar à mão (no efeito do provider) evita divergência com o HTML estático — o
        // servidor e o 1º render do cliente sempre mostram o esqueleto, nunca o dado salvo.
        skipHydration: true,
        partialize: (state): PersistedTodo => ({ doc: state.doc }),
        migrate: (persisted, version) => migratePersisted(persisted, version) as PersistedTodo,
        merge: (persisted, current) => {
          const parsed = persistedSchema.safeParse(persisted)
          if (!parsed.success) return current
          const { doc } = repairDocument(parsed.data.doc, getCtx())
          // Por quê: ao recarregar (inclusive por mudança vinda de outra aba) a pilha de desfazer
          // deixa de valer — os passos se referem a um documento que não é mais este.
          return { ...current, doc, stacks: EMPTY_STACKS }
        },
        onRehydrateStorage: () => () => {
          store.setState({ hydrated: true })
        },
      }
    )
  )
  return store
}

/** Avisa as outras abas de que o documento mudou e escuta o mesmo aviso delas. */
export const todoSync = createTodoSync()

/** O storage do documento — exposto para o `flush` ao esconder a aba. */
export const todoDocumentStorage = createIdbStorage<PersistedTodo>({
  getRev: (value) => value.state.doc.rev,
  validate: (value) =>
    value.version !== TODO_PERSIST_VERSION || persistedSchema.safeParse(value.state).success,
  onWritten: (rev) => {
    useTodoUi.getState().setPersistError(null)
    todoSync.publish(rev)
  },
  onConflict: () => {
    useTodoUi.getState().setSyncedFromOtherTab(true)
    void useTodoDocument.persist.rehydrate()
  },
  onError: (kind) => useTodoUi.getState().setPersistError(kind),
  onCorrupt: (raw) => useTodoUi.getState().setCorruptData(true, raw),
})

/** A store do documento do app. Só em componentes cliente; nunca em Server Components. */
export const useTodoDocument = createTodoDocumentStore({ storage: todoDocumentStorage })
