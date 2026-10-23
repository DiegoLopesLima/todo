# `src/test/` — helpers de teste

| Export · import | Para que serve |
|---|---|
| `renderWithIntl(ui, options?)` · `@/test/intl` | Render do RTL embrulhado em `NextIntlClientProvider` (catálogo **pt-BR** real + `formats`), `NuqsTestingAdapter` e um `QueryClientProvider` novo por render (sem retry, para uma leitura que falha assentar na hora). `options.searchParams` simula chegar com query params na URL. O `rerender` devolvido **reaplica os providers** (o do RTL os derrubaria e `useTranslations` lançaria). |
| `messages` · `@/test/intl` | O catálogo **pt-BR** real — **asserte contra ele, não contra a copy literal**, para que uma mudança de texto não quebre o teste enquanto uma chave/role faltando ainda quebra. |
| `uuid`, `testCtx`, `item`, `doneItem`, `itemsFrom`, `emptyDoc`, `docWith`, `dailySeries` · `@/test/todo-fixtures` | Fixtures do módulo de tarefas: ids UUID legíveis, contexto determinístico (`testCtx('2026-03-10')` = meio-dia local, ids sequenciais), construtores de item/série/documento. |
| `installFakeBroadcastChannel()`, `FakeBroadcastChannel` · `@/test/broadcast-channel` | `BroadcastChannel` falso (o jsdom não tem): entrega às OUTRAS instâncias do canal, sem eco. Devolve a função que restaura o global. |

Convenções: React Testing Library, testes co-localizados como `*.test.ts(x)`.

## Quando rodar o quê

A regra de verificação é uma só e vive na tabela do `CLAUDE.md` raiz ("Verificação antes de
concluir"). Em resumo: **rode a suíte completa (`npm run test`) uma única vez** quando a mudança
tocar componente, hook, service, util, primitivo, schema, enum ou constante — e não rode a versão
escopada antes dela. `--testPathPatterns=<path>` serve para **iterar sobre um teste que já está
falhando**, não como verificação final.

## Armadilhas

- **Código cliente que importa uma Server Action arrasta o servidor para a árvore de render.** Um
  componente/hook cliente que importa estaticamente uma action `'use server'` pode fazer qualquer
  suíte que o renderize de verdade estourar `ReferenceError: Request is not defined` no jsdom.
  Solução: **stube o filho pesado** no teste de quem consome (`jest.mock('@/components/X', …)`) ou
  mocke o módulo da action.
- **Editor de rich text (TipTap) não é dirigível por eventos do jsdom** — o contenteditable ignora
  `fireEvent.change`. Stube por um `textarea` com o mesmo contrato, mas teste o ciclo de vida
  (montar/recriar/desmontar) com o editor **real**: stubar esconde esse tipo de bug.
- **`embla-carousel-react` também não funciona no jsdom** (precisa de layout real): mocke o hook com
  um fake determinístico.
- **O fuso da suíte é o da máquina — fixture de data all-day tem que ser ancorada em UTC.** Não há
  `TZ` fixado (o Node fixa o fuso ao iniciar o processo e ignora alteração posterior de
  `process.env.TZ`, medido). `new Date('2026-06-23T00:00:00')` (sem `Z`) é meia-noite **local**; use
  `…T00:00:00.000Z` quando o código lê componentes UTC. Para varrer outro fuso de propósito:
  `TZ=Asia/Tokyo npx jest <padrão>`.

`jest.setup.ts` faz polyfill de `TextEncoder`/`TextDecoder`, `matchMedia`, ResizeObserver,
PointerEvent e APIs de `Element` que o jsdom não tem, e **silencia `console.error/warn/info` por
padrão** (um teste que precisa assertar o log faz seu próprio `jest.spyOn`).

---
> Helper de teste compartilhado novo? Adicione aqui na mesma mudança.
