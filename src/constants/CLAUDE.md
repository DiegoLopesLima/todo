# `src/constants/` — constantes nomeadas (sem valor mágico)

**Regra:** nunca use literal numérico ou string solto para um valor com significado semântico. Crie
uma constante nomeada aqui e importe. Reutilize uma existente antes de criar arquivo novo.

```ts
import { ONE_SECOND_IN_MS } from '@/constants/time'
setTimeout(cb, ONE_SECOND_IN_MS * 3)
```

Limites de formulário (tamanho máximo de campo, faixas) moram aqui, **não** dentro do schema Zod —
o schema importa daqui.

## Arquivos

| Arquivo · `@/constants/<arquivo>` | Principais exports |
|---|---|
| `app` | `APP_NAME` (fonte única da marca), `THEME_COLOR` |
| `routes` | `PROTECTED_ROUTES`, `matchesRoute(pathname, prefixes)` — prefixos **sem** o locale |
| `time` | `ONE_SECOND_IN_MS`, `ONE_MINUTE_IN_SECONDS`, `ONE_MINUTE_IN_MS`, `ONE_HOUR_IN_SECONDS`, `ONE_DAY_IN_SECONDS`, `ONE_DAY_IN_MS` |
| `query` | `QUERY_STALE_TIME_MS`, `QUERY_RETRY_COUNT` — defaults do TanStack Query |
| `todo` | Limites e tetos do módulo de tarefas (`TODO_MAX_*`, `TODO_UNDO_LIMIT`, `TODO_HISTORY_*`, `TODO_PRIORITY_WEIGHT`…) — regras em [`docs/modules/todo`](../../docs/modules/todo/rules.md) |
| `pwa` | `SERVICE_WORKER_PATH`, `PWA_BACKGROUND_COLOR`, `PWA_DESCRIPTION`, `PWA_ICON_SIZES`/`PWA_ICON_PIXELS` — manifesto e ícones |
| `todo-storage` | Banco/chaves do IndexedDB, debounce de gravação, canal de sync entre abas, `TODO_PERSIST_VERSION` |

## Regras desta pasta

- Um arquivo por assunto (`routes`, `time`, `query`…), nomeado pelo domínio, não por tipo.
- Constante derivada de outra **importa** a outra (`ONE_DAY_IN_MS = ONE_DAY_IN_SECONDS * …`) em vez de
  repetir o número.
- Catálogo de domínio (uma chave por entrada, com metadados) também mora aqui, como `as const`.
  Se um arquivo passar de ~150 linhas, divida por assunto.

---
> Constante nova ou arquivo novo? Registre na tabela na mesma mudança.
