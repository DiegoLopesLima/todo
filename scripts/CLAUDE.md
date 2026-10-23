# `scripts/` — ferramentas de desenvolvimento

Scripts só com built-ins do Node (sem dependências), para rodarem antes do `npm install` terminar.

| Script | Como roda | Para que serve |
|---|---|---|
| `restore-native-linux.mjs` | `npm run fix:native`, e automático no `pretest` | Cura os binários nativos Linux do Dev Container. Sai cedo fora do Linux. |
| `check-docs.mjs` | `npm run docs:check` | Valida `docs/` e o orçamento dos `CLAUDE.md`: links quebrados, notas órfãs, identificadores citados que sumiram do código, `CLAUDE.md` acima de 200 linhas/12 KB (raiz) ou 16 KB (pasta). Imprime só falhas. `docs/recipes/` fica fora da checagem de identificadores — receita descreve código que ainda não existe. |
| `check-coverage-layers.mjs` | `npm run coverage` (depois do `jest --coverage`) | Piso de cobertura por camada que o Jest não agrupa sozinho: Server Actions e Route Handlers. Camada sem arquivo é ignorada com um aviso. |

## Regras duras

- **Módulo nativo falhando ao carregar ⇒ `npm run fix:native`**, sempre. Host Windows e container
  Linux compartilham um só `node_modules` (WSL2): um `npm install` no host instala só os binários
  win32, e no container todo pacote nativo falha. Não persiga o pacote individual, **não** edite
  `jest.config.ts`/`next.config.ts` (eles estão certos) e **não** rode `npm install` dentro do
  container. Sintomas e causa-raiz: [ambiente de desenvolvimento](../docs/operations/dev-environment.md).
- **Script `.ts` roda com `npx tsx`, nunca `ts-node`** — a saída ESM pura de alguns geradores (o
  client do Prisma 7, por exemplo) quebra o padrão CJS do `ts-node` no Node atual.
- **Nunca mova o servidor de dev do Next para dentro de um container.** O código fica num bind mount
  servido pelo Windows; lá dentro, o polling de filesystem trava o host e produz 404 por manifesto
  obsoleto. O Dev Container serve ao Claude Code (testes, `tsc`, lint), não ao app rodando.

---
> Script novo ou armadilha nova de ambiente? Atualize a tabela na mesma mudança.
