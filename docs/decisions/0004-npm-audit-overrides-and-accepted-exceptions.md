# 0004 — `npm audit`: um `overrides` e uma exceção aceita (`shadcn`, só em desenvolvimento)

**Status:** revisar a cada release do `shadcn` · **Política:** [operations/dependencies.md](../operations/dependencies.md)

## Contexto

O alvo é **zero** vulnerabilidade no `npm audit`. Num `npm install` limpo do template, medido em
2026-10-21, havia 29 achados. O que foi feito com cada grupo:

| Grupo | O que o audit dizia | O que se fez |
|---|---|---|
| `next` (+ `postcss` e `sharp` embutidos) | 3 críticos (execução remota de código: servidores Windows, otimização de imagem e `next/og`), 1 alto (SSRF na otimização de imagem) e vários moderados, em `16.2.x` | `next` fixado em **16.4.2**, a versão corrigida da mesma major. Some o grupo inteiro. |
| `jest` → `babel-plugin-istanbul` → `@istanbuljs/load-nyc-config` → `js-yaml@3` → `argparse@1` → `sprintf-js` | 19 moderados em cadeia (`js-yaml@3` e `sprintf-js`) | `overrides` pontual: `@istanbuljs/load-nyc-config` usa `js-yaml@^4`. Some a cadeia (o `argparse@1` e o `sprintf-js` só vinham por ela). Verificado: `npm run test` e `npm run coverage` passam. |
| `shadcn` → `fast-glob`/`micromatch`/`braces` (+ `ts-morph`) | 7 altos (DoS por padrão aninhado em `braces`) | **Exceção aceita**, abaixo. |

## Decisão

Aceitar os 7 achados que descem de `shadcn`.

- São **só de desenvolvimento**: `shadcn` é `devDependency`, o que ele puxa nunca entra no bundle nem no
  runtime, e o vetor (padrão de glob aninhado e patológico) exige que alguém entregue esse padrão à CLI.
- **Não há versão corrigida a instalar:** `braces` já está na última publicada (`3.0.3`, afetada), e o
  `micromatch`/`fast-glob` que dependem dela também. A correção que `npm audit fix` oferece é
  `shadcn@1.0.0` — um **downgrade** de `4.x` para `1.0.0`, que o `npm audit` apresenta como correção
  mas que não foi testado contra o fluxo de UI do projeto (Base UI, registry `@coss`).
- `shadcn` precisa estar instalado mesmo assim: `globals.css` importa `shadcn/tailwind.css`.

Qualquer entrada **além** das que descendem de `shadcn` é regressão.

## Alternativas descartadas

- **`npm audit fix --force`.** Aplicaria o downgrade acima, uma troca de major sem teste, para limpar
  achados que só existem em ferramenta de desenvolvimento.
- **`overrides` forçando `braces`/`micromatch` para outra versão.** Não existe versão corrigida para
  apontar.
- **Remover `shadcn` e copiar o `tailwind.css` dele para `globals.css`.** Elimina o achado, mas desvia
  do que `npx shadcn@latest init/add` espera encontrar e passa a ser um CSS nosso para manter em
  sincronia com o upstream. Fica como saída se a exceção incomodar mais do que custa.
- **Deixar `next` em `16.2.11`.** Era a versão do projeto de origem, mas carrega os críticos acima.

## Consequências

- O `npm audit` de um projeto novo **não** mostra zero: mostra 7 altos, todos sob `shadcn`. O número
  sozinho deixou de ser sinal; leia quais entradas aparecem.
- O `overrides` do `package.json` prende uma transitiva do `jest` numa major que o `jest` não escolheu.
  Se um bump do `jest` trouxer o `@istanbuljs/load-nyc-config` já corrigido, **remova o override**.
- Revise a cada release do `shadcn`: se ele atualizar `fast-glob`/`ts-morph` para versões sem `braces`
  vulnerável, a exceção some.
