# `src/lib/` — singletons, env e helpers puros

Singletons de SDK/cache/banco, o `env` validado, regras puras (gates, formatadores, slug) e helpers
pequenos. **Nada de regra de negócio com I/O aqui** — isso mora em `src/services/`. Exceção
([ADR 0005](../../docs/decisions/0005-local-first-indexeddb-persistence.md)): o **domínio puro** de um
módulo (sem React, sem I/O) pode morar em `lib/<módulo>/`, como `lib/todo/` (catálogo próprio). Quase
todo arquivo tem `*.test.ts` ao lado; mantenha os helpers puros (sem I/O). Schemas Zod: `validations/`
(catálogo próprio).

## Env

| Export · import | Assinatura | Para que serve |
|---|---|---|
| `env` · `@/lib/env` | `Proxy<Env>` | Env validado com Zod; valida no primeiro acesso a propriedade. |
| `validateEnv` · `@/lib/env` | `() => Env` | Fail-fast listando o que falta; roda no boot (`instrumentation.ts`). |

Variável nova ⇒ schema em `env.ts` **e** linha em `.env.example`, na mesma mudança.

## Helpers

| Export · import | Assinatura | Para que serve |
|---|---|---|
| `cn` · `@/lib/utils` | `(...ClassValue[]) => string` | Junta classes Tailwind (`clsx` + `twMerge`). |
| `api` · `@/lib/axios` | `AxiosInstance` | **O** cliente HTTP do navegador (`baseURL: '/api'`). Nunca `fetch` cru. |
| `makeQueryClient` · `@/lib/query-client` | `() => QueryClient` | Defaults do TanStack Query; um cliente por árvore (ver `QueryProvider`). |
| `toSupportedLocale` · `@/lib/locale` | `(locale, fallback?) => string` | Coage um texto qualquer num locale suportado. Use em todo locale vindo de fora (coluna, formulário). |
| `getStandaloneTranslator` · `@/lib/messages` | `(locale, namespace) => Promise<Translator>` | Tradutor **fora** de uma requisição (job, script, e-mail). Dentro dela, `getTranslations`. |
| `resolveGlobalErrorCopy` · `@/lib/global-error-copy` | `(pathname) => GlobalErrorCopy` | Texto do `global-error.tsx`, que não tem acesso ao provider de i18n. |
| `isMacPlatform`, `modKeyLabel` · `@/lib/platform` | `() => boolean`; `() => '⌘' \| 'Ctrl'` | Plataforma dos atalhos. Só use `modKeyLabel()` em conteúdo que aparece depois da hidratação (tooltip, diálogo). |
| `getDateLocale` · `@/lib/date-locale` | `(locale) => Locale` | O `Locale` do date-fns para o idioma do app (`pt-BR` ou `en`). |
| `downloadTextFile`, `readFileAsText` · `@/lib/download` | `(filename, text, mime?) => void`; `(file) => Promise<string>` | Baixar e ler arquivo no navegador (exceção à regra do Axios). `readFileAsText` usa `FileReader` — `Blob#text()` falta em navegadores mais antigos. |
| `registerServiceWorker` · `@/lib/pwa/register` | `(options?) => Promise<ServiceWorkerRegistration \| null>` | Registra `/sw.js` só em produção; nunca lança. |

## Regras desta pasta

- **Singleton é lazy.** Ler env no carregamento do módulo quebra o `next build` (sem segredos). Um
  cliente de terceiro opcional devolve `null` sem a chave (`getX(): X | null`) e o chamador degrada —
  o app sobe sem a integração configurada. Padrão completo: [receita de integrações](../../docs/recipes/integrations.md).
- **Importe o singleton, nunca instancie o cliente.** Um `new Cliente()` fora daqui duplica conexão e
  escapa do teste.
- **Ícone novo ⇒ acrescente o id a `icon-data/*.json`.** Sem isso o `<Icon>` cai num fetch a
  `api.iconify.design` em runtime, com piscada no primeiro paint. O JSON guarda só o subconjunto
  usado; gere-o a partir do pacote `@iconify-json/<coleção>` ou da API do Iconify. Acrescente o id também à lista de `icons.test.ts`.
- Helper de data usa date-fns; constante semântica vem de `@/constants`, nunca literal solto.

---
> Singleton ou helper novo? Adicione a linha na mesma mudança.
