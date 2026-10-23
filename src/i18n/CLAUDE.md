# `src/i18n/` — roteamento e configuração do next-intl

| Arquivo | Para que serve |
|---|---|
| `routing.ts` | `locales: ['pt-BR', 'en']`, `defaultLocale: 'pt-BR'`. |
| `request.ts` | Config por requisição no servidor — carrega `messages/{locale}.json`. Referenciado implicitamente pelo `createNextIntlPlugin()` em `next.config.ts` (convenção do plugin, não há import direto). |
| `navigation.ts` | `Link`, `redirect`, `usePathname`, `useRouter` com locale — use-os no lugar de `next/link` e `next/navigation`. |
| `formats.ts` | Formatos nomeados de data/número (`shortDate`, `shortDateTime`), usados também nos testes. |

As traduções ficam em `messages/pt-BR.json` e `messages/en.json`, com a **mesma estrutura de chaves**.

## Regras desta pasta

- **Toda string visível ao usuário é traduzida** nos dois idiomas. Nunca hard-code copy no JSX.
- **Notificações e e-mails guardam a chave i18n + parâmetros**, nunca o texto renderizado — assim
  chegam no idioma de quem lê e reagem à troca de idioma.
- Fora de uma requisição (jobs, scripts) use `getStandaloneTranslator(locale, namespace)`
  (`@/lib/messages`).
- **Testes asseguram contra o catálogo, não contra a copy literal:** importe `messages` de
  `@/test/intl`, para que uma mudança de texto não quebre o teste (uma chave faltando ainda quebra).
- Locale novo: acrescente-o em `routing.ts`, crie `messages/<locale>.json`, a entrada em
  `LOCALE_FLAGS` (+ a bandeira em `lib/icon-data`) e o texto em `constants/global-error-copy.ts`
  (o TypeScript acusa o que faltar).

---
> Locale novo, mudança de roteamento ou regra de i18n? Atualize este arquivo na mesma mudança.
