# Receitas — integrações opcionais

> **Receita, não código.** Cada seção diz o que instalar, onde cada arquivo mora e a regra a manter.
> Ao aplicar uma, mova a convenção para o `CLAUDE.md` da pasta, registre a decisão duradoura num
> [ADR](../decisions/README.md) e **encurte ou apague a seção** — o que passou a estar no código não
> se documenta duas vezes.

## O padrão de toda integração opcional

1. **Cliente lazy em `src/lib/`.** Ler env no carregamento do módulo quebra o `next build` (sem
   segredos). O cliente de um terceiro **opcional** devolve `null` sem a chave
   (`getX(): X | null`) e o chamador degrada: o app sobe e roda sem a integração configurada.
2. **Env em dois lugares, na mesma mudança:** schema de `src/lib/env.ts` **e** `.env.example`, este
   com o comentário de onde obter a chave e o que degrada sem ela.
3. **Obrigatória em produção?** Entra numa lista `PRODUCTION_REQUIRED` (`[variável, o que quebra
   sem ela]`) checada por `superRefine` no schema — só quando o ambiente é produção de verdade (não
   preview, não dev/test). Sem isso a integração degrada em silêncio e ninguém vê.
4. **Falha aberta ou fechada, por escrito.** Rate limit, cache e analytics falham **aberto**;
   verificação de permissão e de assinatura falham **fechado**. Registre a escolha no TSDoc.
5. **Terceiro só por `src/services/`** (e o cliente em `src/lib/`). Nada no componente.
6. **Documente a dependência:** o que quebra sem ela, na seção "Integrações externas" de
   `docs/architecture.md` (ou numa nota `docs/operations/integrations.md`).

## Storybook

```bash
npm install -D storybook @storybook/nextjs-vite @storybook/addon-docs @storybook/addon-themes
```

Scripts `"storybook": "storybook dev -p 6006"` e `"build-storybook": "storybook build"`;
`/storybook-static` no `.gitignore`.

- `.storybook/main.ts`: `stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)']`, addons
  docs + themes, framework `@storybook/nextjs-vite`, `staticDirs: ['../public']` e, em `viteFinal`, o
  alias `@` → `src` (espelha o `paths` do `tsconfig.json`).
- `.storybook/preview.tsx`: importa `../src/app/globals.css` (tema Tailwind 4); `withThemeByClassName`
  com `{ light: '', dark: 'dark' }` (o variant `dark` do Tailwind é por classe em ancestral);
  `backgrounds: { disable: true }` (o `body` já pinta o canvas); e um decorator com
  `QueryClientProvider` (um cliente por story, sem retry), `NuqsTestingAdapter` e
  `NextIntlClientProvider` com o catálogo `en`.
- **Regra de UI a acrescentar em `src/components/CLAUDE.md`:** story ao lado do componente
  (`*.stories.tsx`), título `UI/*` para primitivo e `Components/*` para composto, cobrindo
  variantes/tamanhos + disabled/invalid/loading. Criou/alterou/removeu componente ⇒ a story vai junto;
  verifique com `npm run build-storybook`.
- Os primitivos do ShadCN/coss vêm com stories quando instalados por `npx shadcn@latest add`.

## E-mail — Resend + React Email

```bash
npm install resend @react-email/components
```

- `src/lib/resend.ts`: `getResend()` → `Resend | null` (`null` sem `RESEND_API_KEY`). Sem a chave o app
  **registra e pula o envio**, e os fluxos (reset de senha, OTP) continuam de ponta a ponta.
- `EMAIL_FROM` precisa ser um remetente do **domínio verificado**; vazio, o Resend cai no remetente
  sandbox (`onboarding@resend.dev`), que só entrega ao dono da conta. Em produção, ambos entram em
  `PRODUCTION_REQUIRED`, e o schema recusa `EMAIL_FROM` com `resend.dev`.
- `src/emails/`: um componente React Email por e-mail + `CLAUDE.md` de catálogo. **O e-mail é
  renderizado no idioma de quem recebe** (`User.preferredLocale`), não de quem disparou — use
  `getStandaloneTranslator` (`@/lib/messages`), porque o envio costuma rodar fora de uma requisição.
- Skills úteis (instale com `npx skills add` ou copie para `.claude/skills/`): `resend`, `react-email`,
  `email-best-practices` (SPF/DKIM/DMARC, entregabilidade, idempotência, verificação de webhook).

## Tempo real — Ably

```bash
npm install ably
```

- **Sempre Ably — nunca SSE nem conexão longa em função serverless** (a função morre no teto de
  duração e o cliente reconecta em tempestade).
- `src/lib/ably.ts`: `getAblyRest()` (`null` sem `ABLY_API_KEY`) + `isRealtimeConfigured()`.
  O servidor publica por `@/services/realtime`; o navegador assina direto, com um **token de curta
  duração** de `GET /api/ably/token` (rota por usuário, `force-dynamic`, autenticada) — a chave
  nunca vai ao cliente.
- **Um cliente Ably por aba.** Os hooks de tempo real só **assinam canais** num cliente único
  (`@/lib/ably-browser`); cada hook abrindo o próprio cliente multiplica conexões e estoura o limite
  do plano. Escreva isso num ADR ao adotar.
- Em testes, mocke o módulo do navegador; nunca abra conexão real.

## Rich text — TipTap v3

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder sanitize-html
npm install -D @types/sanitize-html
```

- Primitivos em `src/components/ui/`: `RichTextEditor` (HTML na saída) e `RichTextContent` (renderiza
  HTML **já sanitizado**; módulo leve, para não arrastar o TipTap a quem só lê).
- **Sanitize na escrita, no servidor** (`sanitizeRichText`, `@/lib/sanitize-html`, sobre
  `sanitize-html`). Sem CSP com nonce, a defesa contra XSS armazenado é esta — um `onerror=` injetado
  não seria barrado pelos headers.
- `sanitize-html` ≥ 2.17.6 puxa o `htmlparser2` ESM-only: acrescente `sanitize-html|htmlparser2|domhandler|domutils|domelementtype|entities|dom-serializer|parse5`
  ao whitelist de `transformIgnorePatterns` em `jest.config.ts`.
- O editor **não é dirigível por eventos do jsdom**: stube-o por um `textarea` nos testes de quem o
  consome, mas teste o ciclo de vida (recriar ao mudar `enabledFormats`) com o TipTap real
  ([armadilhas de teste](../../src/test/CLAUDE.md)). Skill: `wysiwyg-editor`.

## Cobrança — Stripe

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

- `src/lib/stripe.ts`: `getStripe()` → `null` sem `STRIPE_SECRET_KEY`, lazy (o build não exige
  segredos). `src/lib/stripe-client.ts` no navegador, com `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (sem ela
  os Elements não montam).
- **Webhook** em `app/api/webhooks/stripe/route.ts`: **verifica a assinatura** (`STRIPE_WEBHOOK_SECRET`)
  e responde 503 se o segredo falta — falha **fechado**. **Idempotência:** grave o id de cada evento
  processado (tabela própria) e ignore repetição; o Stripe reenvia.
- Em desenvolvimento, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (CLI logada)
  encaminha os eventos e imprime o `whsec_…` a colar no `.env`. Um `dev.mjs` pode automatizar isso,
  como *best-effort* que nunca bloqueia o boot.
- Em produção as três variáveis entram em `PRODUCTION_REQUIRED`: sem o secret do webhook o estado da
  assinatura nunca sincroniza.
- Cobrança trancando recursos: o gate de assinatura é **uma função pura** (`resolveSubscriptionGate`,
  `status → 'allow' | 'suspended' | 'subscribe'`), no mesmo molde do `resolveAuthGate`.

## Jobs em segundo plano — Trigger.dev

```bash
npm install @trigger.dev/sdk
npm install -D @trigger.dev/build
```

- `trigger.config.ts` na raiz: `project: process.env.TRIGGER_PROJECT_REF ?? ''`, `dirs: ['./src/trigger']`,
  `maxDuration: 60` e `retries` com backoff (3 tentativas, `factor: 2`, `randomize`; `enabledInDev:
  false` para o erro aparecer na primeira execução).
- Tarefas em `src/trigger/` (+ `CLAUDE.md`), **idempotentes** — a política de retry só é segura por
  isso. Rodam fora do Next: use `getStandaloneTranslator` para texto e serviços de `src/services/`
  para dados. Sem `TRIGGER_SECRET_KEY` o agendamento é salvo mas nunca dispara: degrade e registre.
- Execução local: `npx trigger.dev@latest dev`.

## Analytics — PostHog

```bash
npm install posthog-js posthog-node
```

- **Só inicializa após o consentimento de cookies** (`src/instrumentation-client.ts` + um
  `useCookieConsent`); antes disso as funções de `@/lib/posthog-client` são no-op. Sem
  `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` tudo vira no-op.
- **Proxy first-party** para não perder evento a bloqueador: `rewrites` no `next.config.ts` de
  `/ingest/*` para o host do PostHog (assets em `*-assets.i.posthog.com`), mais
  `skipTrailingSlashRedirect: true` (os endpoints terminam em barra) e **excluir `ingest` do
  `matcher` do `proxy.ts`** — os rewrites do Next só rodam depois do proxy, e sem a exclusão o
  next-intl redirecionaria para `/pt-BR/ingest/…`.
- No servidor, **uma única porta**: `@/services/analytics` (`trackEvent`, `identifyUser`); nunca
  importe `posthog-node` fora dali. Catálogo central de eventos em `src/constants/analytics.ts`; um
  marco de negócio novo é uma entrada ali e uma linha no documento de taxonomia.
- Captura de `$pageview` é manual no App Router (a navegação client-side não dispara o autocapture),
  num componente dentro de um boundary Suspense (usa `useSearchParams`).

## Storage de arquivos e imagens — Pinata + sharp

```bash
npm install pinata sharp
```

- `src/lib/pinata.ts`: singleton lazy + `isStorageConfigured()`; **toda chamada `pinata.*` passa por
  `withPinataRetry`** (backoff em 429/5xx). Sem `PINATA_JWT` o módulo mostra "storage não configurado"
  e degrada.
- **Upload guard** (`isUploadAllowed`, `@/lib/upload-guard`): recusa HTML/SVG/XML, scripts e
  executáveis por extensão, MIME **e** bytes iniciais — nunca confie só na extensão.
- **`sharp` (módulo nativo, libvips):** `serverExternalPackages: ['sharp']` impede o bundle, mas
  **não** faz o tracer de output da Vercel embarcar o binário de plataforma — o `require()` condicional
  em `process.platform` não é seguido, e a produção cai com `ERR_DLOPEN_FAILED: libvips-cpp.so…`.
  Declare `outputFileTracingIncludes` para `'/*'` com `node_modules/sharp/**/*`,
  `node_modules/@img/sharp-linux-x64/**/*` e `node_modules/@img/sharp-libvips-linux-x64/**/*`, e
  registre um ADR. Localmente sempre funciona (o `node_modules` inteiro está no disco), então o erro
  só aparece no deploy. Veja também o `fix:native` em [ambiente](../operations/dev-environment.md).

## Feature flags

Um mecanismo para trocar, em produção, **qual comportamento uma feature oferece daqui para a frente**,
sem deploy de código. Duas peças: `FEATURE_FLAG_REGISTRY` em `src/constants/feature-flags.ts` (uma
entrada por flag: env var, valores válidos, default) e `getFeatureFlag(key)` em
`src/lib/feature-flags.ts` (lê a env var, valida, cai no default se ausente ou inválida — **nunca
lança**). A fonte hoje é env var; o contrato não amarra isso, então override por tenant ou painel
remoto é uma mudança dentro de `getFeatureFlag`.

**Regra que toda flag segue:** uma flag decide o que uma ação *nova* faz a partir de agora — nunca
reinterpreta o que já aconteceu (o dado já gravado continua como foi). Não crie um segundo mecanismo
de flag.
