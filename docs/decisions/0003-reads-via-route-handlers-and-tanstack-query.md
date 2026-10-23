# 0003 — Leituras do navegador por Route Handler + TanStack Query; mutações seguem Server Action

**Status:** vigente · **Regra operacional:** `src/app/CLAUDE.md`, `src/app/api/CLAUDE.md`

## Contexto

Ler dados no navegador por **Server Action** e guardar o resultado em `useState` à mão (com `Set`s de
"carregando" e gates de requisição em voo) reimplementa um cache dentro de cada componente. E pesa
mais um fato: a doc do Next é explícita de que o cliente despacha Server Actions **uma por vez**, e
leitura por action "introduz execução sequencial" (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`,
"Sequential dispatch"). Uma leitura espera atrás de qualquer escrita em voo — abrir uma tela fica
atrás de uma gravação lenta.

Além disso, toda mutação no padrão `await action → toast → router.refresh()` re-renderiza a árvore
do servidor inteira só para refletir uma mudança pequena, e dá espaço para a tela "piscar" até a
gravação voltar.

## Decisão

- **Leitura no navegador** = `GET` num Route Handler (`src/app/api/`) consumido por `useQuery` do
  **TanStack Query v5**, sobre o Axios compartilhado (`@/lib/axios`). Defaults em `makeQueryClient`
  (`@/lib/query-client`), provido por `QueryProvider` dentro de `Providers`. Chaves de query ficam
  num módulo único em `src/lib/` (`query-keys`), criado junto com a primeira leitura.
- **Mutação** continua **Server Action**. Quem tem estado cacheado no cliente invalida a query afetada
  (`invalidateQueries`); quem é dirigido por props do servidor aplica um valor otimista e deixa o
  `router.refresh()` trazer a verdade.
- Telas dirigidas por URL (filtros, busca, ordenação) **não** ganham cache: a lista atual fica na
  tela, esmaecida, enquanto a nova chega.

## Critério — quando é otimista, quando espera o servidor

- **Otimista, com rollback e aviso:** a ação é reversível por quem a fez e a recusa é rara
  (seguir, comentar, trocar um responsável, excluir um item já confirmado).
- **Espera o servidor:** formulário com erro que o usuário corrige no lugar, o que o servidor decide
  (id, unicidade), o que mexe em cobrança ou permissão e exclusão em cascata.
- **Nunca em cache:** dado sensível ao tempo (disponibilidade, estoque). Leitura em cache é sempre
  **revalidada ao reaparecer** (`staleTime: 0` naquela query).

## Alternativas descartadas

- **TanStack com Server Action como `queryFn`.** Funciona, mas herda a fila: a leitura continua
  esperando as escritas.
- **`useOptimistic` do React em telas dirigidas por props do servidor.** O valor otimista cai quando
  a transition termina, e o `router.refresh()` chamado depois de um `await` não garante manter a
  transition aberta até as props novas chegarem — o valor voltaria ao antigo por um instante.

## Consequências

- A rota de leitura **repete** a checagem de acesso da action que substitui; qualquer gate novo
  precisa existir nos dois lados enquanto os dois existirem.
- JSON não preserva `Date`: o payload de uma rota de leitura usa strings ISO.
- Escritas continuam enfileiradas pelo cliente. Isso também ajuda: duas escritas no mesmo registro
  chegam ao servidor na ordem em que o usuário as fez.
- O padrão de leitura só aparece em código quando a primeira tela precisar dele; até lá este ADR é a
  referência e `src/app/api/health/route.ts` é o único Route Handler.
