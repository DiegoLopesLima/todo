# Decisões (ADR)

Decisões técnicas com consequência duradoura: o que foi decidido, o que foi descartado e o que se
paga por isso. Uma decisão registrada aqui **não se reescreve** — se for revista, escreva uma nova e
marque a antiga como substituída.

Nem toda escolha vira ADR. Vira quando a resposta a "por que não do jeito óbvio?" custaria uma
investigação para quem chegar depois, ou quando reverter sem saber o motivo causaria dano.

Os ADRs abaixo vêm do template e valem para qualquer app nesta stack. Novos entram com o próximo
número livre (a skill `knowledge-base` traz o modelo).

| Nº | Decisão | Status |
|---|---|---|
| [0001](0001-knowledge-layer-in-docs.md) | Conhecimento do projeto vive em `docs/`, indexado e recuperado sob demanda | vigente |
| [0002](0002-combobox-replaces-select.md) | `Select` removido; todo controle de seleção é o `Combobox` do coss | vigente |
| [0003](0003-reads-via-route-handlers-and-tanstack-query.md) | Leituras do navegador por Route Handler + TanStack Query; mutações seguem Server Action | vigente |
| [0004](0004-npm-audit-overrides-and-accepted-exceptions.md) | `npm audit`: `next` na versão corrigida, um `overrides` no `jest` e uma exceção aceita (`shadcn`, só dev) | revisar a cada release do `shadcn` |
| [0005](0005-local-first-indexeddb-persistence.md) | Dados 100% locais: Zustand `persist` sobre IndexedDB, com duas exceções às regras de camada (`services` client-only e domínio puro em `lib/<módulo>`) | revisar se o documento passar de ~3 MB ou houver sync entre dispositivos |
| [0006](0006-dnd-kit-core-behind-pure-resolver.md) | Arrastar e soltar com `@dnd-kit/core`, atrás de uma função de destino pura (`resolveDrop`) | revisar quando o `@dnd-kit/react` chegar à 1.0 |
| [0007](0007-recurrence-series-and-idempotent-materialization.md) | Recorrência por série, com ocorrências reais geradas de forma idempotente | vigente |
| [0008](0008-service-worker-written-by-hand.md) | PWA com service worker escrito à mão em `public/sw.js` | revisar se uma lib de PWA tiver suporte verificado ao Turbopack |
| [0009](0009-undo-by-patches-and-append-only-history.md) | Desfazer por patches em memória; histórico persistido e só-acrescenta | vigente |

## Formato

Curto. Contexto · Decisão · Alternativas descartadas · Consequências · Status. Status é `vigente`,
`substituída por NNNN` ou `revisar quando <condição verificável>` — nunca "talvez rever um dia".
