# `src/enums/` — enums compartilhados (const tuples)

Definidos como tuplas `as const` + tipo de união derivado (não `enum` do TS), para os valores
existirem em runtime e servirem ao Zod e ao banco.

```ts
export const ROLES = ['owner', 'member'] as const
export type Role = (typeof ROLES)[number]
```

| Arquivo · `@/enums/<arquivo>` | Export | Valores |
|---|---|---|
| `todo` | `PRIORITIES` | `p1 \| p2 \| p3 \| p4` (p4 = padrão) |
| `todo` | `TODO_VIEWS` | `today \| upcoming \| all` |
| `todo` | `RECURRENCE_FREQUENCIES` | `daily \| weekly \| monthly \| yearly` |
| `todo` | `HISTORY_EVENT_TYPES`, `HISTORY_ORIGINS` | tipos de evento do histórico; `user \| system` |
| `todo` | `IMPORT_MODES`, `SERIES_SCOPES` | `merge \| replace`; `this \| future \| series` |

## Regras desta pasta

- Valor que o banco também conhece é **o mesmo** valor aqui: ao adicionar um, atualize o schema do
  banco e crie a migration na mesma mudança.
- `z.enum(ROLES)` valida na borda; nunca repita a lista de valores num schema.

---
> Enum novo? Adicione a linha na mesma mudança.
