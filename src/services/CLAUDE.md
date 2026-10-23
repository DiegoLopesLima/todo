# `src/services/` — camada de serviço (todo o acesso a dados vive aqui)

**Fronteira dura:** toda chamada a banco, cache e API de terceiro mora num módulo de `src/services/`.
Server Components, Route Handlers e Server Actions chamam funções daqui — nunca tocam no cliente do
banco/cache diretamente. O navegador chega aqui só via `@/lib/axios` contra `/api`.

[Arquitetura](../../docs/architecture.md) · [receita de banco de dados](../../docs/recipes/database.md).

## Convenções

- **Result type para falha esperada:** devolva `{ ok: true; … } | { ok: false; error: '…' }` em vez
  de lançar, para erro de domínio (ex.: slug em uso). `throw` fica reservado para bug.
- **Falha aberta vs. fechada:** rate limit e cache falham **aberto** (serviço fora → permite);
  verificação de permissão falha **fechado** (nega).
- Helper de autorização guarda mutação — chame primeiro, antes de qualquer escrita.
- Assinatura e porquê ficam no **TSDoc**; a tabela abaixo é só o índice.

## Serviços client-only (local-first)

Exceção documentada no [ADR 0005](../../docs/decisions/0005-local-first-indexeddb-persistence.md): o
app de tarefas não tem servidor, então o acesso a dados é ao **navegador** (IndexedDB, canal entre
abas, cota de armazenamento) e **não passa pelo Axios**. Estes módulos só rodam no cliente — nada
neles toca `indexedDB`/`BroadcastChannel` no carregamento do módulo (o servidor importa o arquivo,
mas nunca chama as funções).

## Índice por domínio

| Módulo · `@/services/<arquivo>` | Exports principais |
|---|---|
| `todo-storage` | `createIdbStorage(options)` → `PersistStorage` do Zustand sobre IndexedDB (debounce, guard de revisão entre abas, cópia de dado corrompido, recusa gravar após leitura que falhou, fallback em memória) + `flush()`; `createMemoryStorage()`; `StorageErrorKind` |
| `todo-sync` | `createTodoSync(channel?)` → `{ publish(rev), subscribe(listener) }` — avisa as outras abas de que o documento mudou |
| `storage-persistence` | `requestPersistentStorage()`, `estimateStorage()` — cota e armazenamento persistente do navegador |

---
> Serviço novo? Adicione a linha na mesma mudança.
