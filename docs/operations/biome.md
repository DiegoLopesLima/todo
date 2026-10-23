# Biome — escreva já no padrão

Config em `biome.json`: preset `recommended` + formatter. Escreva o código já conforme abaixo; assim
`lint:fix` não tem o que corrigir e o `pre-commit` não barra. A regra curta vive no `CLAUDE.md` raiz.

## O que o Biome **não** formata

`biome.json` deixa de fora `**/*.md` (as notas de `docs/` e os `CLAUDE.md` são escritos à mão, com
tabelas compactas — o formatador do Biome ≥ 2.6 as realinharia em colunas largas, que custam token a
cada leitura), `src/lib/icon-data` (subconjuntos de ícones gerados, em JSON minificado), `.claude` e
`.obsidian`.

**A versão do Biome é fixa** (`2.6.2`, sem `^`), e o `$schema` do `biome.json` acompanha. Atualizar é uma
mudança deliberada: suba as duas juntas, rode `npm run lint` e corrija o que as regras novas acusarem —
uma regra nova num `^` quebraria o lint de todo projeto criado do template no dia seguinte.

## Formatação (o `lint:fix` reescreve, mas escreva assim)

- 2 espaços, `lineWidth` 100, aspas simples, **sem ponto e vírgula**, vírgula final `es5`, LF.
- Imports ordenados (`organizeImports`): não reordene à mão contra a ferramenta.

## Regras que mais geram aviso

Avisos com "Unsafe fix" **não** são aplicados por `--write`: precisam de edição manual, então acerte
de primeira.

- **`useOptionalChain`:** `a?.b` em vez de `a && a.b`; `!a?.b` em vez de `!a || !a.b`;
  `x?.kind !== 'k'` em vez de `!x || x.kind !== 'k'`.
- **`useConst`, `noUnusedVariables`, `noUnusedImports`:** `const` por padrão; remova o que não usa
  (prefixe com `_` só parâmetro posicional obrigatório).
- **`noExplicitAny`:** use `unknown` + Zod/narrowing.
- **`noNonNullAssertion`:** trate o `null` em vez de `!`.
- **`useTemplate`:** template literal em vez de concatenar strings.
- **Hooks (`useExhaustiveDependencies`):** liste todas as dependências reais.
- **a11y:** `button` com `type`, `label` com controle, `img` com `alt`, sem `onClick` em elemento
  não interativo (exceção: `noLabelWithoutControl` desligada em `src/components/ui/**`).

## Rodar

`npm run lint` é reescrito pelo hook do RTK para um filtro de ESLint que engole a saída do Biome
(`ESLint output (JSON parse failed…)`). Para checar, use **`rtk proxy npm run lint`** (uma vez) — não
rode o comando com e sem proxy. Para escrever, `npm run lint:fix`.
