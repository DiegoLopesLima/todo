# Bootstrapping — começar um projeto a partir do template

O template é **uma pasta para copiar**: nada nela é específico de um produto. Siga a lista na
ordem; cada item diz onde mexer e como confirmar.

## 1. Copiar e instalar

1. Copie a pasta inteira (inclusive os dotfiles: `.devcontainer`, `.claude`, `.husky`, `.vscode`,
   `.obsidian`) para o diretório do projeto novo.
2. `cp .env.example .env`
3. `npm install` — no **host**, não dentro do Dev Container (ver
   [ambiente de desenvolvimento](dev-environment.md)).
4. `git init` e o primeiro commit **antes** de qualquer outra coisa: o `husky` (hooks de commit e de
   push) só se instala dentro de um repositório git. Se o `npm install` rodou antes do `git init`,
   rode `npm run prepare` depois dele.

## 2. Dar nome ao projeto

| O quê | Onde |
|---|---|
| Nome do pacote | `name` em `package.json` |
| Nome da marca, mostrado no título do documento | `APP_NAME` em `src/constants/app.ts` |
| Cor da marca | família `--primary-*` em `src/app/globals.css` e `THEME_COLOR` em `src/constants/app.ts` |
| Título do `README.md` e descrição | `README.md` |
| Nome do Dev Container | `name` em `.devcontainer/devcontainer.json` |
| Ícones e favicon | adicione `src/app/favicon.ico`, `icon.png` e `apple-icon.png` (convenção de arquivos do Next) |

## 3. Limpar o que é exemplo

- `src/app/[locale]/page.tsx` e as chaves `home.*` de `messages/*.json`: troque pela primeira tela real.
- `docs/modules/_exemplo/`: apague ao criar o primeiro módulo (e a linha de exemplo em `docs/README.md`).
- Linhas "Nenhum ainda" nos `CLAUDE.md` de `src/services/`, `src/enums/`, `src/store/` e `src/types/`:
  substitua ao criar o primeiro item.
- Preencha os trechos ✏️ de [`docs/architecture.md`](../architecture.md).

## 4. Confirmar que está saudável

Um comando pesado por vez (o Dev Container não aguenta paralelo — ver
[ambiente de desenvolvimento](dev-environment.md)):

```bash
npx tsc --noEmit
npm run lint
npm run test
npm run docs:check
npm audit
```

Todos devem passar, **exceto** o `npm audit`, que mostra 7 altos sob `shadcn` — a exceção aceita do
[ADR 0004](../decisions/0004-npm-audit-overrides-and-accepted-exceptions.md). Entrada que não descenda
dali é regressão. Diga no resumo da sua primeira mudança o que o `npm audit` mostrou.

## 5. Ligar o que o produto precisa

Nada disso vem ligado — cada item é uma [receita](../README.md#receitas--o-que-entra-quando-o-app-precisar)
com o que instalar, onde cada arquivo mora e a regra a manter: banco de dados, autenticação, e-mail,
tempo real, rich text, cobrança, jobs, analytics, storage e Storybook.

## 6. Deploy

O template não assume plataforma. Se for Vercel, `npm run build` é o comando de build; se o app
ganhar banco, ele passa a ser `prisma generate && prisma migrate deploy && next build` (ver a
[receita de banco de dados](../recipes/database.md)). Variáveis de ambiente de produção vêm de
`.env.example` — o que for obrigatório em produção entra em `PRODUCTION_REQUIRED` em `src/lib/env.ts`.

## 7. Abrir no Obsidian

*Open folder as vault* na raiz do projeto. Está tudo configurado em `.obsidian/`.
