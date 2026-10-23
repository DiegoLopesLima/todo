# `src/lib/todo/` — domínio puro do módulo de tarefas

Regra de negócio **pura**: sem React, sem I/O, sem `Date.now()`/`crypto` soltos. O relógio e a fábrica
de ids chegam por `Ctx` (`@/lib/todo/ctx`), então tudo é determinístico e testável. É a exceção (b) do
[ADR 0005](../../../docs/decisions/0005-local-first-indexeddb-persistence.md). Comportamento esperado:
[`docs/modules/todo`](../../../docs/modules/todo/rules.md).

**Toda mutação passa por `runCommand`** (`@/lib/todo/commands`) — é ele que registra o histórico, sobe
a revisão, recalcula o dia zerado e devolve o patch do desfazer. Não escreva `{ ...item, done: true }`
fora de um comando.

## Catálogo

| Módulo · `@/lib/todo/<arquivo>` | Principais exports |
|---|---|
| `dates` | `DateKey` (`YYYY-MM-DD`, dia local sem fuso), `addDays`, `addMonths`, `diffInDays`, `weekdayOf`, `isRealCalendarDate`, `toDateKey(Date)`, `toLocalDate(key)`. Aritmética em UTC sobre inteiros. |
| `ids` | `newId()` (UUID com fallback fora de contexto seguro), `occurrenceId`, `occurrenceChildId`, `isValidItemId`, `ITEM_ID_PATTERN` |
| `ctx` | `Ctx` (`now`, `today`, `newId`), `makeCtx(now?)`, `isoNow(ctx)` |
| `tree` | `Items`, `childrenIndex` (memoizado por referência), `childIds`, `siblingsOf`, `ancestorsOf`, `descendantsOf`, `depthOf`, `subtreeHeight`, `canMove` |
| `order` | `compareSiblings` (concluído, prioridade, rank), `rankAtEndOfBand`, `rankBetween`, `rankForDrop`, `resolveDropPriority`, `rebalanceRanks`, `rankBySoonestDue` |
| `completion` | `setDone` (propaga pai↔filhos), `reconcileFrom`, `progressOf` (memoizado), `checkState` |
| `recurrence` | `occurrencesInRange`, `nextOccurrence`, `firstOccurrenceOnOrAfter` — diária/semanal/mensal/anual |
| `materialize` | `materializeDue(doc, ctx)` — gera as ocorrências devidas, idempotente, com tetos; `blueprintHeight` |
| `filters` | `buildVisibleRows` (visão, busca, recolhimento), `upcomingPreviews`, `normalizeSearch`, `Row` |
| `stats` | `dayScope`, `isDayCleared`, `computeStreak`, `pruneClearedDays` |
| `drop` | `resolveDrop` — destino (pai, prioridade, rank) de um arrasto; função pura que o adaptador de DnD só alimenta |
| `quick-add-parser` | `parseQuickAdd` — `!1`…`!4` no início ou fim do texto |
| `integrity` | `repairDocument` — conserta órfãos, ciclos, nível excessivo, invariante pai↔filhos |
| `history` | `buildEvent`, `appendHistory` (funde reordenações, poda), `filterHistory`, `undoneEventIds` |
| `patch` | `diffDocs`, `invertPatch`, `applyPatch` — a base do desfazer (cursores de geração ficam de fora) |
| `undo` | `pushUndo`, `undoStep`, `redoStep`, `toUndoEntry`, `EMPTY_STACKS` |
| `export-import` | `buildExport`, `serializeExport`, `parseImportText`, `planImport`, `mergeHistory` |
| `move-plans` | `planSiblingMove`, `planIndent`, `planOutdent`, `planMoveTo` → `MovePlan` (pai, prioridade, rank) para teclado/menu — as mesmas regras de ordem do arrasto |
| `parents` | `buildParentOptions` — pais possíveis (sem ciclo, respeitando o limite de níveis) para o seletor "Dentro de"/"Mover para" |
| `format` | `formatDayLabel` ("hoje", "amanhã", "qua., 12 mar."), `formatDayLong` |
| `recurrence-form` | `defaultRepeatFields`, `ruleToFields`, `fieldsToRule` — ponte entre o formulário de repetição e `Recurrence` |
| `migrate` | `migratePersisted` — passos de migração do documento persistido |
| `commands/` | `runCommand(doc, cmd, ctx)`, `runMaterialize(doc, ctx)`, tipos `Command`/`RunResult` |

## Regras desta pasta

- **Preserve a identidade** do que não muda (`state.items[id]` continua `===`): é o que torna barato
  o `memo`, os seletores por id e o `diffDocs`. Teste com `toBe`.
- **Índice de filhos é memoizado por referência**: nunca mute um `Items` depois de lê-lo com
  `childIds`/`siblingsOf` — crie um objeto novo.
- Cada ocorrência recorrente é um item real com id `${série}:${data}`; gerar de novo nunca duplica.
- Limites são constantes de `@/constants/todo`, não números soltos.

---
> Módulo novo ou export novo? Adicione a linha na mesma mudança.
