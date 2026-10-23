# `src/app/` — App Router: rotas, grupos e erros

App Router com prefixo de locale em `[locale]/`. Componente específico de uma página fica **ao lado**
do seu `page.tsx` (junto do `*.test.tsx`); UI compartilhada mora em `src/components/`. Mutação usa
**Server Action** (`actions.ts` ao lado da rota); leitura no navegador é `GET` num Route Handler
consumido por `useQuery` — **nunca** Server Action como leitura, que o Next enfileira atrás das
escritas ([ADR 0003](../../docs/decisions/0003-reads-via-route-handlers-and-tanstack-query.md)).

Regras de negócio e contexto de cada módulo ficam em `docs/` — comece pela
[base de conhecimento](../../docs/README.md) e leia só a nota indicada. Módulo com regra própria tem
`CLAUDE.md` na sua pasta.

## Estrutura (`src/app/`)

| Caminho | Conteúdo |
|---|---|
| `[locale]/layout.tsx` | `<html>`, fontes, `NextIntlClientProvider` e `Providers`. Valida o locale e dá `notFound()` num inválido. |
| `[locale]/page.tsx` · `[locale]/TodoApp.tsx` | **A home é o app de tarefas** (sem login, sem backend). O `page.tsx` é um Server Component mínimo; `TodoApp` é a raiz cliente (`TodoProvider` + Suspense + animações). Detalhes em [`_components/CLAUDE.md`]([locale]/_components/CLAUDE.md) e [`docs/modules/todo`](../../docs/modules/todo/rules.md). |
| `[locale]/not-found.tsx` · `[...rest]/page.tsx` | 404 localizado. O catch-all chama `notFound()` para a página renderizar **dentro** do layout do locale, em vez de cair no `_not-found` interno do Next (que não tem layout raiz). |
| `[locale]/error.tsx` · `[locale]/loading.tsx` | Fronteira de erro e fallback de carregamento da árvore do locale. |
| `global-error.tsx` | Última rede: renderiza só quando o próprio layout raiz quebra. Tem `<html>`/`<body>` e dicionário próprios (`GLOBAL_ERROR_COPY`), porque o provider de i18n mora no layout que quebrou. |
| `api/` | Route Handlers — [catálogo](api/CLAUDE.md). |
| `manifest.ts` · `icon.svg` · `api/pwa-icon` | Manifesto (`/manifest.webmanifest`), favicon/ícone SVG e ícones PNG do app instalável. O service worker é `public/sw.js` (ver [ADR 0008](../../docs/decisions/0008-service-worker-written-by-hand.md)). |
| `globals.css` | Tailwind 4: `@theme inline`, tokens claro/escuro e `@layer base`. |

Grupos de rota `(auth)`, `(public)`, `(protected)` entram com a [receita de autenticação](../../docs/recipes/auth.md);
um segmento com casca própria (sidebar, por exemplo) ganha o seu `error.tsx` e `layout.tsx`.

## Telas de erro e de carregamento

`error.tsx` renderiza `RouteError` (`@/components/RouteError`): texto traduzido, "Tentar novamente"
(`unstable_retry` — o contrato do Next 16) e o `digest` para casar com o log do servidor. Rota que lê
banco ganha um `loading.tsx` com `RouteLoading`. **Este não é o Next que você conhece:** antes de
mexer em convenção de arquivo, leia `node_modules/next/dist/docs/`.

## Regras duras

- **Toda página autenticada é sub-rota de `/dashboard`.** Página pública fica na raiz do locale. Nunca
  crie caminho privado fora de `/dashboard` — ficaria sem gate. `PROTECTED_ROUTES`
  (`@/constants/routes`) é o único prefixo.
- **Navegação usa `@/i18n/navigation`** (`Link`, `redirect`, `useRouter`), nunca `next/link` nem
  `next/navigation`: só os wrappers preservam o locale.
- **Componente servidor por padrão.** `'use client'` só onde há estado, efeito ou evento; empurre a
  fronteira o mais fundo possível.
- **Página estática por locale:** `generateStaticParams` (no layout) + `setRequestLocale(locale)` no
  layout **e em cada `page.tsx`**. Sem isso o next-intl lê o locale dos headers e a rota vira
  dinâmica (`ƒ` no `next build`) mesmo sem dado por requisição.
- **`params` e `searchParams` são `Promise`** — `await` (ou `use`) antes de ler.
- Página com `revalidate`/cache estático não lê `cookies()`, `headers()` nem `useSearchParams()` sem
  um boundary Suspense: isso força a rota inteira para renderização dinâmica.

---
> Rota, grupo ou convenção nova? Atualize a tabela na mesma mudança.
