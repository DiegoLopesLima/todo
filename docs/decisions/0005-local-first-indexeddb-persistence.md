# 0005 — Dados 100% locais: Zustand `persist` sobre IndexedDB, com duas exceções às regras de camada

**Status:** vigente · revisar quando o documento passar de ~3 MB ou o produto precisar sincronizar
entre dispositivos · **Regras de comportamento:** [`docs/modules/todo`](../modules/todo/rules.md)

## Contexto

O app de tarefas não tem autenticação nem banco remoto: tudo vive no navegador e precisa funcionar
sem internet. O template, porém, manda que (a) todo acesso a dados passe por `src/services/` e que o
navegador só chegue aos dados via Axios, e (b) `src/lib/` não carregue regra de negócio. Nenhuma das
duas regras foi escrita pensando em dados locais.

## Decisão

- O estado do documento (itens, séries recorrentes, histórico) é uma store Zustand com o middleware
  `persist`, cujo `storage` é um adaptador próprio sobre IndexedDB (via `idb-keyval`). Ninguém grava no
  IndexedDB fora desse adaptador: o resto do app só chama `dispatch` na store.
- O adaptador mora em `src/services/` e passa a existir uma categoria de **serviço client-only
  (local-first)**: acesso a dados do navegador, sem Axios. É a exceção (a) à regra de que o navegador
  só chega aos dados via Axios.
- O **domínio puro** do módulo (árvore, ordem, recorrência, comandos, undo) mora em `src/lib/<módulo>/`,
  sem React nem I/O, com relógio e ids injetados. É a exceção (b): regra de negócio **com I/O** continua
  em `services`; regra de negócio **pura** de um módulo pode morar em `lib/<módulo>/`, onde já recebe o
  piso de cobertura de `lib`.

## Alternativas descartadas

- **`localStorage`.** Síncrono e sem dependência, mas o limite de ~5 MB e a escrita bloqueante
  pesam quando o histórico cresce; obrigaria uma poda agressiva do que o usuário quer consultar.
- **Dexie (IndexedDB com índices e consultas).** Poderoso demais para um documento único, e
  disputaria com o Zustand o papel de fonte de verdade.
- **Um backend.** Fora do escopo: o produto é deliberadamente sem conta e sem servidor.

## Consequências

- O 1º render (e o HTML estático) mostra um esqueleto até a hidratação assíncrona terminar; a store
  usa `skipHydration` e um gate de "hidratado".
- Limpar os dados do navegador apaga tudo. Mitigações: pedido de armazenamento persistente,
  exportação/importação JSON e um lembrete de backup.
- Duas abas escrevem o mesmo documento: há um contador de revisão que impede sobrescrever uma escrita
  mais nova e um canal de broadcast que avisa as outras abas. O resíduo conhecido é *last-writer-wins*
  por documento inteiro; merge por item é evolução futura.
- Testes do adaptador usam `fake-indexeddb`; o resto da suíte injeta um storage em memória.
