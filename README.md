# my-app

Aplicação [Next.js](https://nextjs.org/) (App Router) criada a partir do template: i18n `pt-BR` + `en`,
tema claro/escuro, ShadCN/coss, Zod, TanStack Query, testes, Biome, Husky, Dev Container para o Claude
Code e uma base de conhecimento em `docs/` que se mantém junto com o código.

> Convenções de engenharia: [`CLAUDE.md`](./CLAUDE.md). Regras de negócio, decisões e contexto por módulo:
> [`docs/`](./docs/README.md) — comece pelo índice, não pela pasta.

## Requisitos

- [Node.js](https://nodejs.org/) 20+ (o dev server do Next roda **nativo**, no host)
- Git
- Opcional: [Docker](https://docs.docker.com/get-docker/) + a extensão *Dev Containers* do VS Code, para
  trabalhar com o Claude Code isolado (ver abaixo)

## Primeira execução

```bash
git init                      # antes do install: o husky só instala hooks dentro de um repo git
cp .env.example .env
npm install
npm run dev                   # http://localhost:3000 → redireciona para /pt-BR
```

Idiomas suportados: **`pt-BR`** (padrão) e **`en`** → `http://localhost:3000/en`.

Tem pressa? O checklist completo (nome do projeto, cor da marca, o que apagar) está em
[`docs/operations/bootstrapping.md`](./docs/operations/bootstrapping.md).

## Dia a dia

```bash
npm run dev          # dev server (nativo)
npm run test         # Jest
npm run lint         # Biome (lint:fix / format para escrever)
npx tsc --noEmit     # tipos
npm run docs:check   # valida a base de conhecimento
npm run build        # build de produção
```

Commits seguem [Conventional Commits](https://www.conventionalcommits.org/) (validado pelo Husky); o
`pre-commit` roda o Biome e o `pre-push` roda a suíte completa.

## Dev Container (Claude Code)

`.devcontainer/` define um sandbox para o Claude Code rodar testes, `tsc` e lint sobre o mesmo código,
com firewall de saída restrito e o [RTK](https://github.com/rtk-ai/rtk) comprimindo o output dos
comandos. **O app em si continua rodando no host**: o container não sobe o dev server (um hook em
`.claude/hooks/` o bloqueia).

1. VS Code → *Dev Containers: Reopen in Container*.
2. Dentro dele, módulo nativo falhando ao carregar? `npm run fix:native` — a causa e o diagnóstico de
   tudo que pode travar estão em [`docs/operations/dev-environment.md`](./docs/operations/dev-environment.md).

## Base de conhecimento no Obsidian

A vault é a **raiz do repositório**: *Open folder as vault* e escolha a pasta que contém `package.json`.
A configuração já está em `.obsidian/`, e o graph mostra as notas de `docs/` e os `CLAUDE.md` no mesmo
mapa. É opcional — tudo é Markdown e lê bem em qualquer editor.

## Quando o produto precisar de mais

Banco de dados, autenticação, e-mail, tempo real, rich text, cobrança, jobs, analytics, storage e
Storybook **não vêm ligados**. Cada um é uma receita em [`docs/recipes/`](./docs/README.md#receitas--o-que-entra-quando-o-app-precisar):
o que instalar, onde cada arquivo mora e a regra a manter.
