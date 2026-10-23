# CLAUDE.md

> **⚠️ Este não é o Next.js que você conhece.** A versão usada aqui tem breaking changes — APIs,
> convenções e estrutura de arquivos podem divergir do seu treinamento. Antes de escrever código
> Next.js, leia o guia correspondente em `node_modules/next/dist/docs/` e respeite os avisos de
> depreciação.

## Quatro camadas — onde procurar e onde escrever

| Camada | É a verdade sobre | Quando entra em contexto |
|---|---|---|
| **Código + TSDoc** | **a realidade**: como está implementado | você lê |
| **`docs/`** | regras de negócio, contexto, decisões, operação | você lê, guiado pelo índice |
| **`CLAUDE.md`** | o que **fazer**: catálogo do que existe e regras da pasta | automático |
| **RTK** | — | hook global: comprime o output dos comandos |

**Antes de uma tarefa que envolva regra, comportamento ou "por que isto é assim": abra
[base de conhecimento](docs/README.md) e leia só o arquivo que ele indicar.** O caminho é adivinhável —
`docs/modules/<module>/rules*.md` e `context*.md`; o índice é desempate, não pedágio. Mudança que
não toca nada disso (cor, espaçamento, refatoração interna) não passa por `docs/`.

- **O código é a fonte da verdade.** Nota que o contradiz é defeito da nota até prova em contrário —
  investigue e corrija na mesma tarefa, não escolha um dos dois no chute.
- **Terminou?** Se a mudança alterou arquitetura, decisão, integração, convenção ou comportamento de
  uma feature, atualize a nota correspondente **na mesma mudança**. Alteração trivial não vira
  documentação. O protocolo completo (onde cada fato mora, template de ADR, regras anti-corrupção)
  está na skill `knowledge-base`; valide com `npm run docs:check`.
- Cada pasta com recursos reaproveitáveis tem seu `CLAUDE.md`, carregado automaticamente quando você
  edita algo lá. **Leia o da pasta antes de trabalhar nela e reutilize o que estiver catalogado antes
  de escrever código novo.**
- Regra transversal mora **só** aqui; o detalhe e o porquê moram num lugar só, e os outros apontam
  para ele. Não repita a mesma regra em dois `CLAUDE.md`.
- Orçamento por `CLAUDE.md`: **200 linhas e 12 KB** (bytes importam mais que linhas). Estourou? Ou a
  pasta precisa ser dividida, ou o excedente é narrativa que pertence a `docs/` ou a um comentário no código.

## Stack

Next.js (App Router) · React 19 · Tailwind 4 · ShadCN/UI + coss.com/ui (Base UI) · Iconify · React Hook
Form + Zod · TanStack Query · Zustand · nuqs · Axios · next-intl (pt-BR + en) · date-fns · usehooks-ts ·
Jest 30 + Testing Library · Biome · Husky + commitlint.

Banco (Prisma 7 + PostgreSQL), cache (Redis), autenticação (NextAuth) e as integrações (Resend, Ably,
TipTap, Stripe, Trigger.dev, PostHog, Pinata, Storybook) **não vêm ligados**: são
[receitas](docs/README.md#receitas--o-que-entra-quando-o-app-precisar) a aplicar quando o produto pedir.
Versões, no `package.json`.

**Este app é um checklist _local-first_ (módulo `tarefas`):** sem backend nem login; os dados vivem no
navegador (Zustand `persist` sobre IndexedDB via `idb-keyval`) e o app é uma PWA que abre offline —
[ADR 0005](docs/decisions/0005-local-first-indexeddb-persistence.md). A home **é** o app.

## Mapa de pastas

Código em `src/`, App Router em `src/app/`, alias `@/` → `src/`. O que não é óbvio pelo nome:

- `src/services/` — **todo acesso a dados** (nasce vazia). `src/lib/` — singletons, `env` validado,
  helpers puros, schemas Zod em `lib/validations/`. Os dois têm catálogo de exports no `CLAUDE.md` da pasta.
- `src/components/` — UI composta; `ui/` são os primitivos. Componente de uma página fica **ao lado**
  do `page.tsx` dela, não aqui.
- `src/constants/` valores nomeados · `src/enums/` tuplas compartilhadas · `src/hooks/` · `src/store/`
  (Zustand) · `src/providers/` · `src/i18n/` · `src/test/` (helpers de teste).
- Cada módulo de produto e cada pasta com recurso reaproveitável tem seu próprio `CLAUDE.md`.

## Regras transversais

Valem em todo o projeto. O `CLAUDE.md` da pasta acrescenta o detalhe e o porquê — nunca repete a regra.

- **i18n:** toda string visível ao usuário é traduzida em `pt-BR` **e** `en`. Nunca hard-code copy.
- **Validação:** Zod em tudo (formulários, payloads de API, env, parsing em runtime).
- **Formulários:** React Hook Form + `zodResolver`; derive os tipos do schema. Nunca gerencie estado
  de formulário na mão.
- **HTTP:** use o Axios compartilhado (`@/lib/axios`). *Exceções:* download de blob, chamadas
  servidor→terceiro e os dados locais do navegador (IndexedDB, ADR 0005) — documente cada uma onde nasce.
- **Acesso a dados:** banco, cache e terceiros só dentro de `src/services/`; importe os singletons de
  `@/lib/*`, nunca instancie. *Exceções:* scripts standalone em `scripts/` e o domínio puro do módulo em `src/lib/<módulo>/` (ADR 0005).
- **Datas:** date-fns. **Constantes:** nada de literal semântico solto — importe de `src/constants/`.
- **Estado:** Zustand **só** para estado compartilhado entre componentes não relacionados.
- **Tema:** toda superfície suporta claro + escuro via CSS variables — nunca hard-code cor.
- **UI:** instale de ShadCN/coss antes de escrever componente à mão; controles de seleção usam o
  `Combobox` do coss (**nunca** `Select`); só utilitários Tailwind; ícones via `@iconify/react`.
- **Rotas privadas** ficam sob `/dashboard`; a regra de acesso é uma função pura e testada, nunca uma
  teia de condicionais ([receita de autenticação](docs/recipes/auth.md)).
- **Tempo real:** sempre um serviço gerenciado (Ably) — nunca SSE nem conexão longa em função serverless.

## Comentários no código

- **TSDoc** (`/** */`) em todo export reaproveitável: uma linha do que faz. `@param`/`@returns` só
  quando o nome não basta.
- **Contexto de negócio, decisão de design ou bug que motivou o código** ⇒ bloco `//` logo acima do
  trecho, começando por `// Por quê:`. Se a explicação não cabe ao lado do código que ela justifica,
  ela pertence a `docs/`: comportamento esperado vai para as regras do módulo, racional e histórico
  para o contexto, decisão duradoura para um ADR.
- **Recurso cuja razão de existir não é óbvia** ⇒ `@see` apontando quem o consome
  (ex.: `@see QueryProvider — único consumidor`).
- Não comente o óbvio e não deixe comentário datado ("alterado em 12/03") — para isso existe o git.

## Comandos

```bash
npm run dev          # Next.js NATIVO no host. http://localhost:3000
npm run build        # next build
npm run test         # Jest (roda fix:native antes)
npm run lint         # Biome check (lint:fix / format para escrever)
npm run docs:check   # valida docs/ e o orçamento dos CLAUDE.md
npm run coverage     # Jest com cobertura + piso por camada
npm run fix:native   # restaura binários nativos Linux quando Jest/next/biome não carregam
```

**Nunca** mova o servidor de dev do Next para dentro de um container. Porquês e diagnóstico de
ambiente travado: [ambiente de desenvolvimento](docs/operations/dev-environment.md).

> **O Claude Code não consegue rodar este app.** O sandbox não tem navegador. Não inicie o servidor
> de dev nem tente "abrir o app"/tirar screenshot — isso é trabalho do humano no ambiente dele. Isso é
> **bloqueado por hook** (`.claude/hooks/block-long-running-bash.mjs`), não só documentado. Diga no
> resumo quando a mudança ainda precisar da conferência visual do usuário.

## Verificação antes de concluir

Verifique **proporcionalmente ao risco**. Encontre a linha da sua mudança:

| Mudança | Verificação |
|---|---|
| Só cor, espaçamento, sombra, ícone, `className` visual | `npx tsc --noEmit` |
| Só comentário ou README | nada |
| Qualquer `CLAUDE.md` ou arquivo de `docs/` | `npm run docs:check` |
| Texto de UI: chave **nova** em `messages/*.json` | `npx tsc --noEmit` |
| Texto de UI: alterar/remover **valor** de chave existente | `grep` da string nos testes; havendo, suíte completa |
| Componente, hook, service, util, `src/components/ui/`, schema Zod, enum, constante | `npm run test` + `npx tsc --noEmit` |
| `package.json` / lockfile | `npm audit` + `npm run test` + `npx tsc --noEmit` |

- **Um comando pesado por vez** — `test`, `tsc`, `lint` e `build` juntos estouram a RAM e derrubam o
  Dev Container. A suíte já limita workers: não mexa em `JEST_WORKERS`.
- **Nunca rode a suíte escopada e depois a completa.** Pedida a completa, rode **só** `npm run test`,
  uma vez. `--testPathPatterns=<path>` serve para **iterar sobre um teste que já falha**, não como
  verificação final.
- **Escreva já no padrão do Biome** ([regras](docs/operations/biome.md)) e rode `npm run lint:fix` ao
  concluir. Conferir: `rtk proxy npm run lint`.
- Os testes usam as mensagens **reais** de `messages/pt-BR.json` (`src/test/intl.tsx`) e vários
  asseguram texto literal — por isso alterar o valor de uma tradução exige a checagem acima.

## Git e qualidade

- **Commits:** Conventional Commits (Husky `commit-msg`): `feat`, `fix`, `chore`, `docs`, `refactor`,
  `test`, `style`, `perf`, `ci`.
- **Pre-commit** roda `biome check`; **pre-push** roda a suíte completa. Nunca use `--no-verify`.
- **Vulnerabilidades:** mexeu em `package.json`/lockfile ⇒ rode `npm audit` **e a suíte** na mesma
  mudança, sem esperar ser pedido, e **diga no resumo o que o `npm audit` mostrou**. Alvo: 0, com as
  exceções já aceitas. Nunca aceite a sugestão do `npm audit` sem conferir que ela resolve
  (`npm audit fix --force --dry-run`); ficando sem correção possível, **não decida sozinho** —
  exponha as opções. Política: [dependências e `npm audit`](docs/operations/dependencies.md).

## Segurança de dados

Hoje o app não tem banco. **Ao adotar um, siga a
[receita de banco de dados](docs/recipes/database.md) e traga para cá a seção "Produção e segurança
de dados"**: migration aplicada é imutável, nenhum comando destrutivo sem confirmar em voz alta qual
`DATABASE_URL` está ativo, e `migrate reset`/`push --force`/bulk delete exigem confirmação a cada vez.

## Skills (`.claude/skills/`)

**Sempre ativas:** `next-best-practices` (qualquer código Next.js), `shadcn` (qualquer trabalho ShadCN).

| Quando | Skill |
|---|---|
| Consultar ou manter o conhecimento de `docs/` | `knowledge-base` |
| Planejar feature multi-etapa | `writing-plans` |
| Construir UI | `ui-ux-pro-max`, `frontend-design`, `accessibility`, `tailwind-design-system`, `vercel-composition-patterns`, `emil-design-eng` |
| Escrever/revisar código | `vercel-react-best-practices`, `typescript-advanced-types`, `tdd` |
| Depurar / finalizar | `systematic-debugging`, `verification-before-completion` |
| Refatorar | `improve-codebase-architecture` |
| Testes E2E | `playwright-best-practices` |
| Procurar uma skill nova | `find-skills` |

---

> Adicionou recurso reaproveitável ou regra? Atualize o `CLAUDE.md` **da pasta** na mesma mudança.
> Este arquivo só muda quando algo **global** muda.
