# Dependências e `npm audit`

Política de vulnerabilidades e as armadilhas de bump já encontradas. A regra curta ("mexeu em
`package.json`/lockfile ⇒ rode `npm audit` na mesma mudança") vive no `CLAUDE.md` raiz; o porquê e o
histórico ficam aqui.

## Alvo e postura

Alvo: **zero**. Prefira `overrides` pontual ou bump direto a `npm audit fix --force` — o `--force`
já propôs rebaixar uma dependência maior inteira para resolver um aviso de uma transitiva.

**Antes de aceitar a sugestão do `npm audit`, confira que ela realmente resolve:** rode
`npm audit fix --force --dry-run` e leia o relatório resultante. `fixAvailable` pode apontar um
downgrade que nem chega a limpar a vulnerabilidade.

Se algo ficar sem correção possível (`fixAvailable: false`, ou uma versão que o `--dry-run` mostra
continuar vulnerável), **não decida sozinho**: pesquise, exponha as opções e deixe a escolha com a
pessoa. Uma exceção aceita vira um [ADR](../decisions/README.md) com o racional e a condição de
revisão — sem isso, o número do `npm audit` deixa de ser sinal.

## Bump de dependência ⇒ rode a suíte antes de dar como resolvido

Um bump patch/minor pode trocar uma sub-dependência transitiva para ESM-only e quebrar o Jest com
"Cannot use import statement outside a module". A correção é adicionar o pacote — e o pacote pai, se
ele vier aninhado em `node_modules/<pai>/node_modules/<pacote>` — ao whitelist de
`transformIgnorePatterns` em `jest.config.ts`. **Não reverta o bump.**

## Exceções vigentes

Os 7 achados que descem de `shadcn` (só desenvolvimento, sem versão corrigida) e o `overrides` do
`jest`: racional, o que foi testado e como rever no
[ADR 0004](../decisions/0004-npm-audit-overrides-and-accepted-exceptions.md). Como o `npm audit` de um
projeto novo não fica em zero por causa delas, o número sozinho deixou de ser sinal: leia **quais**
entradas aparecem. Qualquer uma além das que descendem de `shadcn` é regressão.

## Dependências do módulo de tarefas

`idb-keyval` (IndexedDB), `fractional-indexing` (posição manual), `@dnd-kit/*` (arrastar), `motion`
(animação de layout), `canvas-confetti` (celebração), `@daypicker/react` (calendário, via coss) e, só
em desenvolvimento, `fake-indexeddb`. `idb-keyval` e `fractional-indexing` são ESM e entram no
whitelist de `transformIgnorePatterns` do `jest.config.ts`. Motivos de cada escolha:
[ADRs 0005–0009](../decisions/README.md).

## Versões fixadas

`next`, `react`, `react-dom` e o `@biomejs/biome` estão fixados (sem `^`): o Next 16 tem mudanças de API entre
minors, e o app foi verificado contra estas versões exatas. Suba-os de propósito, lendo
`node_modules/next/dist/docs/` e rodando a suíte.

## Relacionado

- [bootstrapping](bootstrapping.md) — gerar o lockfile e conferir o `npm audit` de um projeto novo
- [receita de banco de dados](../recipes/database.md) — `pg` preso por `overrides` quando o Prisma entra
