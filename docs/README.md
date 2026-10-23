# Base de conhecimento

Conhecimento sobre o projeto: regras de negócio, contexto histórico, decisões e operação.
**Instrução operacional não mora aqui** — mora nos `CLAUDE.md`. **A verdade sobre a implementação é
o código** — quando uma nota discordar dele, a nota está errada até prova em contrário.

**Leia só o arquivo que a tabela indicar, nunca a pasta inteira.** O caminho é adivinhável:
`modules/<module>/rules*.md` e `modules/<module>/context*.md`.

Chegando agora? [Arquitetura do sistema](architecture.md) explica a forma do app — camadas, i18n, tema,
o que é público — e o [glossário](glossary.md) traduz a língua do negócio para a do código.

## Por módulo

| Módulo | Código | Regras de negócio | Contexto e decisões |
|---|---|---|---|
| Tarefas (lista hierárquica local-first) | `app/[locale]/`, `lib/todo/`, `store/`, `services/` | [geral](modules/todo/rules.md) · [ordem](modules/todo/rules-order.md) · [recorrência](modules/todo/rules-recurrence.md) · [histórico](modules/todo/rules-history.md) · [dados e offline](modules/todo/rules-data.md) | [contexto](modules/todo/context.md) · [recorrência](modules/todo/context-recurrence.md) · [offline](modules/todo/context-pwa.md) · [ADRs 0005–0009](decisions/README.md) |

## Transversal

| Preciso de… | Onde |
|---|---|
| Entender a forma do sistema: camadas, i18n, tema, o que é público | [arquitetura do sistema](architecture.md) |
| Por que uma decisão técnica foi tomada assim | [decisões (ADR)](decisions/README.md) |
| Rodar, depurar ou destravar o ambiente de dev | [ambiente de desenvolvimento](operations/dev-environment.md) |
| Política de dependências e `npm audit` | [dependências e `npm audit`](operations/dependencies.md) |
| Regras do Biome para já escrever o código conforme o lint | [Biome](operations/biome.md) |
| Começar um projeto novo a partir do template | [bootstrapping](operations/bootstrapping.md) |
| O que uma palavra do negócio significa | [glossário](glossary.md) |

## Receitas — o que entra quando o app precisar

Receita descreve **código que ainda não existe** neste projeto: o que instalar, onde cada arquivo
mora e a regra a manter. Quando uma receita é aplicada, o que ela ensinou passa a viver no código, no
`CLAUDE.md` da pasta e, se houver decisão duradoura, num ADR — e a receita é apagada ou encurtada.

| Quero… | Receita |
|---|---|
| Banco de dados (PostgreSQL), cache (Redis) e Prisma 7 | [banco de dados](recipes/database.md) |
| Login, sessão e rotas privadas (NextAuth v5) | [autenticação](recipes/auth.md) |
| Storybook, e-mail, tempo real, rich text, cobrança, jobs, analytics, storage | [integrações](recipes/integrations.md) |

## Abrir no Obsidian

A vault é a **raiz do repositório**, não esta pasta: no Obsidian, *Open folder as vault* → selecione
a pasta que contém `package.json` e `CLAUDE.md`. A configuração já está commitada em `.obsidian/`
(links relativos, `node_modules`/`.next` fora do índice, graph colorido por tipo de nota), então não
há nada a configurar na primeira abertura.

É a raiz, e não `docs/`, para o graph mostrar as notas **e** os `CLAUDE.md` no mesmo mapa — as
ligações entre conhecimento e instrução são justamente o que vale olhar. Comece por este arquivo.

## Onde cada coisa mora

| Tipo de fato | Lugar |
|---|---|
| Como está implementado | o código |
| Por que **este trecho** é assim | comentário `// Por quê:` ao lado dele |
| Comportamento esperado do produto | `modules/<module>/rules*.md` |
| Racional, histórico, alternativa descartada | `modules/<module>/context*.md` |
| Decisão técnica com consequência duradoura | `decisions/NNNN-*.md` |
| Runbook, política, diagnóstico de ambiente | `operations/` |
| O que o Claude deve **fazer** automaticamente | `CLAUDE.md` da pasta |

Para criar, mover ou atualizar conhecimento aqui, use a skill `knowledge-base` — ela traz o
protocolo completo (template de ADR, regras anti-corrupção, o que fazer quando doc e código
discordam). Valide com `npm run docs:check`.
