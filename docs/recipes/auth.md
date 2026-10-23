# Receita — autenticação (NextAuth v5, JWT stateless)

> **Receita, não código.** Pressupõe a [receita de banco de dados](database.md) (um modelo `User` e
> um serviço de usuário). Ao aplicar, mova a convenção para `src/app/CLAUDE.md` e `src/lib/CLAUDE.md`
> e apague o que passou a estar no código.

## 1. Instalar

```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

`.env.example` e o schema de `src/lib/env.ts` ganham `AUTH_SECRET` (**mínimo 32 caracteres** —
`openssl rand -base64 32`; o `env` valida) e `AUTH_TRUST_HOST="true"` (só atrás de um proxy confiável
que define o `Host`/`X-Forwarded-*`). Em `jest.setup.ts`, um `AUTH_SECRET` de teste via `||=`.

## 2. Peças

| Arquivo | Responsabilidade |
|---|---|
| `src/auth.config.ts` | Config **edge-safe** do NextAuth (sem provider que dependa de Node): páginas, callbacks `jwt`/`session`. É o que o `proxy.ts` instancia para ler a sessão do cookie. |
| `src/auth.ts` | Config completa, com o provider de credenciais, usada pelo servidor (`auth()`, `signIn`, `signOut`). |
| `src/types/next-auth.d.ts` | Module augmentation: `Session.user.id` e o que mais o JWT carregar. Documente-o na tabela de `src/types/CLAUDE.md`. |
| `src/lib/auth-gate.ts` | **`resolveAuthGate`** — função pura e testada: `({ rest, locale, isLoggedIn, fullPath }) => decisão`. É a **fonte única** de "esta requisição pode passar". |
| `src/proxy.ts` | Compõe o middleware do next-intl com `auth(...)`: só **converte** a decisão de `resolveAuthGate` em resposta (redirect para `/sign-in?callbackUrl=…`, ou para fora das páginas de auth se já logado). |
| `src/lib/safe-redirect.ts` | `resolveCallbackUrl(callbackUrl, locale)`: valida o redirect pós-login (só caminho relativo do próprio app — nunca open redirect). |
| `src/lib/session-revocation.ts` | `isSessionRevoked(iat, sessionsValidFrom)`: invalida JWT emitido antes de `User.sessionsValidFrom` (logout global, troca de senha). Sem `iat`, **falha fechado**. |
| `src/services/auth.ts` | `authenticateCredentials(email, password)`, com rate limit de login (Redis, falha aberto) e **comparação de hash também para e-mail inexistente** (`bcrypt.compare` contra um hash dummy), para não vazar por tempo de resposta quem tem conta. |
| `src/app/[locale]/(auth)/` | `sign-in/`, `sign-up/`, `forgot-password/` — públicas, com `layout.tsx` próprio. |
| `src/app/[locale]/(protected)/` | O `layout.tsx` **é** o gate no servidor: sessão → usuário carregado → demais gates, nesta ordem. Tudo privado vive sob `dashboard/`. |
| `src/app/api/auth/[...nextauth]/route.ts` | `export const { GET, POST } = handlers` |

## 3. Regras duras

- **Toda página privada é sub-rota de `/dashboard`** (`PROTECTED_ROUTES`, `@/constants/routes`). Um
  caminho privado fora dali nasceria sem gate.
- **A regra de acesso é `resolveAuthGate`; nunca a duplique.** Caso novo = estender a função e o teste
  dela. O `proxy.ts` e o layout só aplicam a decisão.
- **Logout é submit de `<form action={signOutAction.bind(null, locale)}>`**, nunca `onClick`
  imperativo: o item de menu desmonta no clique e perde o `Set-Cookie` da action, então o JWT nunca é
  limpo e a pessoa continua logada.
- **Senha:** `bcryptjs`, custo ≥ 12; a mensagem de erro de login é a **mesma** para e-mail inexistente
  e senha errada.
- **Sessão stateless em JWT.** Não existe Bearer token: o navegador envia o cookie de sessão. Route
  Handler autentica com um helper único (`resolveRequestMembership`, ou equivalente) que aplica **os
  mesmos gates do layout** — rota de API não pode ser um atalho em volta deles.
- Sessão compartilhada entre subdomínios (se o app tiver um por cliente) exige o cookie no domínio
  pai, derivado de `AUTH_URL`; `localhost` e IP caem em cookie host-only. Em desenvolvimento, `lvh.me`
  (ver [ambiente](../operations/dev-environment.md)).
- **Idioma preferido:** com `User` no banco, `useLocaleChoice` pode chamar uma Server Action que grava
  `User.preferredLocale` (best-effort, no-op para anônimo), e e-mails passam a ser renderizados no
  idioma **de quem recebe**, não de quem disparou.

## 4. Testes

- `resolveAuthGate` é puro: teste cada ramo (anônimo/logado × protegida/auth/pública × com/sem
  `callbackUrl`).
- Código cliente que importa estaticamente uma Server Action arrasta `@/auth` para o jsdom e estoura
  `ReferenceError: Request is not defined`: stube o filho pesado ou mocke a action
  ([armadilhas de teste](../../src/test/CLAUDE.md)).

## 5. Documentação a atualizar

`src/app/CLAUDE.md` (grupos de rota e a escada de gates), `src/lib/CLAUDE.md` (a seção "Autenticação e
acesso"), `src/types/CLAUDE.md`, `docs/architecture.md` ("O que é público e o que não é") e as notas
de cada superfície pública, com o modelo de ameaça dela.
