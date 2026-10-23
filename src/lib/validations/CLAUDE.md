# `src/lib/validations/` — schemas Zod

Todo formulário, payload de API e parsing em runtime passa por um schema Zod daqui. O tipo do
formulário **deriva do schema** (`z.infer`); nunca declare o tipo à mão em paralelo.

| Export · import | Para que serve |
|---|---|
| `requiredString(message, max)` · `@/lib/validations/common` | String obrigatória e aparada, com limite. `message` é **chave i18n** do namespace `validation`. |
| `emailSchema(message)` · `@/lib/validations/common` | E-mail normalizado em minúsculas. |
| `itemSchema`, `seriesSchema`, `recurrenceSchema`, `blueprintSchema`, `historyEventSchema`, `todoDocumentSchema`, `exportFileSchema`, `quickAddSchema`, `detailsFormSchema` · `@/lib/validations/todo` | O documento de tarefas e o arquivo de exportação. Tipos derivados: `Item`, `Series`, `Recurrence`, `Blueprint`, `HistoryEvent`, `TodoDocument`, `ExportFile`, `DetailsFormValues`. Datas são `dateKeySchema` (rejeita 31/02); ids, `itemIdSchema` (UUID, sem `__proto__`). |

## Regras desta pasta

- **A mensagem de erro é chave de i18n, não texto.** O formulário a traduz (`t(error.message)`), e o
  schema continua sem conhecer locale. Chave nova entra em `pt-BR.json` **e** `en.json`.
- **Limites vêm de `@/constants`**, não de número solto no schema.
- Um arquivo por domínio (`user.ts`, `order.ts`…); o que serve a vários vive em `common.ts`.
- Formulário: React Hook Form + `zodResolver(schema)`. Nunca gerencie estado de formulário à mão.
- O mesmo schema valida no cliente (UX) **e** no servidor (segurança) — a Server Action ou o Route
  Handler **sempre** reparseia a entrada, mesmo que o formulário já tenha validado.

---
> Schema compartilhado novo? Adicione a linha na mesma mudança.
