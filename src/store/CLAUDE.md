# `src/store/` — stores Zustand

**Regra:** use Zustand **só** quando o estado precisa ser compartilhado entre componentes não
relacionados (sem ancestral comum que possa carregá-lo). Para estado co-localizado, prefira estado
local ou context.

| Store · import | Estado + ações | Para que serve |
|---|---|---|
| `useTodoDocument` · `@/store/todo-document` | `doc`, `stacks`, `hydrated`; `dispatch(command)`, `undo()`, `redo()`, `materialize()` | **Fonte da verdade** da lista (persistida no IndexedDB). O único jeito de mudar a lista é `dispatch`. Fábrica: `createTodoDocumentStore({ storage, getCtx })` para testes. Exporta também `todoDocumentStorage`, `todoSync`, `emptyTodoDocument`. |
| `useTodoPrefs` · `@/store/todo-prefs` | `collapsed`, `confetti`, `celebratedDay`, `hasSeenHelp`, `hydrated`; `toggleCollapsed`, `setConfetti`, `markDayCelebrated`, `markHelpSeen` | Preferências de interface (persistidas). Fora do documento: não entram no desfazer nem no histórico. Fábrica: `createTodoPrefsStore(storage)`. |
| `useTodoUi` · `@/store/todo-ui` | `today`, `persistError`, `syncedFromOtherTab`, `corruptData`, `modalCount`, `recentlyDone`, `celebration`; `setToday`, `openModal`/`closeModal`, `holdOpen`/`releaseHold`, `celebrate`… | Estado efêmero compartilhado entre partes não relacionadas da tela. Nada persistido. |

## Regras desta pasta

- Um arquivo por store, nomeado pelo domínio (`notifications.ts`), exportando `useXxx`.
- Estado semeado pelo servidor entra por uma ação `setInitial(...)` chamada num componente cliente;
  nunca importe a store num Server Component.
- Seletor em vez do estado inteiro: `useXxx((s) => s.campo)`, para não re-renderizar à toa.
- Leitura dentro de callback de evento (não de render) usa `useXxx.getState()`.
- **Store persistida:** `persist` com `skipHydration: true` (hidrata no `TodoProvider`, nunca no 1º
  render — o HTML estático e o cliente precisam bater), `partialize` só do que deve sobreviver, e
  `storage` **injetável** (`create…Store(storage)`) para o teste usar `createMemoryStorage`. Nada
  grava no IndexedDB fora do adaptador de `@/services/todo-storage`.
- O documento só muda por `dispatch(command)`; estado de foco, edição inline e arrasto é **local**
  ao componente, não vai para uma store.

---
> Store nova? Adicione a linha na mesma mudança.
