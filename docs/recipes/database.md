# Receita — banco de dados (PostgreSQL), cache (Redis) e Prisma 7

> **Receita, não código.** O template nasce sem banco. Esta nota é o que instalar, onde cada arquivo
> mora e as regras que custaram caro. Ao aplicar, mova o que virar convenção para
> `src/services/CLAUDE.md`, `src/lib/CLAUDE.md` e um `prisma/CLAUDE.md`, e **apague o que passou a
> estar no código**.

## 1. Instalar

```bash
npm install @prisma/client @prisma/adapter-pg ioredis
npm install -D prisma
```

Adicione os scripts ao `package.json`:

```json
"db:migrate": "prisma migrate dev",
"db:deploy": "prisma migrate deploy",
"build": "prisma generate && prisma migrate deploy && next build",
"postinstall": "node scripts/postinstall.mjs"
```

E prenda o driver (ver [pg 8.18.0](#pg-preso-em-8180) abaixo):

```json
"overrides": { "pg": "8.18.0" }
```

## 2. Infraestrutura: Postgres + Redis em contêiner, Next nativo

`docker-compose.yml` na raiz — **só** os dois serviços; o Next continua rodando no host (ver
[ambiente de desenvolvimento](../operations/dev-environment.md)):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: app_postgres
    restart: unless-stopped
    # Credenciais só de desenvolvimento — nunca usadas em produção.
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports: ["5432:5432"]
    volumes: [pg_data:/var/lib/postgresql/data]
    healthcheck:
      # HEALTHY só quando aceita conexão: `--wait` e o `migrate deploy` dependem disso.
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
  redis:
    image: redis:7-alpine
    container_name: app_redis
    restart: unless-stopped
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 5s
volumes:
  pg_data:
  redis_data:
```

`.env.example` ganha `DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"` e
`REDIS_URL="redis://localhost:6379"` (e o schema de `src/lib/env.ts`, na mesma mudança).

**`scripts/dev.mjs`** (Node puro, sem dependências) vira o `npm run dev`: sobe os contêineres com
`docker compose up -d --wait`, roda `prisma generate` + `prisma migrate deploy`, inicia o `next dev`
como processo filho, espera responder, imprime um resumo de prontidão e, no Ctrl+C, mata a árvore do
Next e para os contêineres. **Rode `docker compose up` sempre com `--wait` ou `-d`** — o hook do
Claude Code bloqueia a forma que nunca devolve o controle.

## 3. Prisma 7

- **Generator `prisma-client`** (não `prisma-client-js`), saída TypeScript em `src/generated/prisma`
  (`runtime = "nodejs"`). Adicione `/src/generated/prisma` ao `.gitignore` e `!src/generated/**` à
  cobertura do Jest. **Importe de `@/generated/prisma/client`** — `PrismaClient`, o namespace
  `Prisma`, tipos de modelo e enums.
- **A URL do banco fica em `prisma.config.ts`, não no `schema.prisma`** (o Prisma 7 removeu `url` do
  bloco `datasource`). O arquivo de config roda fora do grafo de módulos do Next e **não** carrega
  `.env`: leia `DATABASE_URL` do `.env` à mão quando `process.env` estiver vazio, e caia num
  placeholder para `prisma generate` — que só lê o schema e nunca conecta — não abortar o
  `npm install`.
- **Adapter obrigatório em runtime.** `src/lib/prisma.ts`:
  `new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max }) })`, com o
  client e o adapter cacheados em `global` fora de produção (hot reload não pode vazar pools).
  Em serverless cada instância abre o próprio pool: use `max` baixo (5) em produção e aponte
  `DATABASE_URL` para o endpoint **com pooler** do provedor.
- **`next.config.ts`:** `serverExternalPackages: ['@prisma/adapter-pg']` e
  `transpilePackages: ['@prisma/client']`. O segundo existe porque o Turbopack trata
  `@prisma/client` como externo por padrão e, em dev, tenta copiá-lo para
  `.next/dev/node_modules/@prisma/client-<hash>`; o subpath `runtime/client` falha nessa cópia
  (`ENOENT … lstat`). Um pacote **não** pode estar nos dois arrays ao mesmo tempo — nunca ponha
  `@prisma/client` em `serverExternalPackages`.
- **`scripts/postinstall.mjs`:** roda `prisma generate` **só se** `prisma/schema.prisma` existir (e
  propaga o status de saída, para uma falha real ainda quebrar o install). Dependência zero.
- **Scripts `.ts` rodam com `npx tsx`**, nunca `ts-node` (o client é ESM puro). Eles falam com o
  banco **direto**, pelo client gerado + `@prisma/adapter-pg`, com import relativo — rodam fora do
  Next, então não usam `@/lib/prisma` nem o alias. É a exceção documentada à regra "Prisma só em
  `src/services/`".
- **Jest:** `jest.setup.ts` precisa do polyfill de `TextEncoder` (o `pg` o usa no load) e de
  `DATABASE_URL`/`REDIS_URL` dummy via `process.env.X ||=` — teste nunca toca banco nem rede.
- **Singletons lazy.** `src/lib/redis.ts` constrói o cliente no primeiro uso (`Proxy`),
  com `lazyConnect: true`, `maxRetriesPerRequest: 1` e um listener `error` (sem ele o ioredis
  transforma erro de conexão em exceção não capturada). **Redis falha aberto**: rate limit com Redis
  fora permite a requisição; verificação de permissão falha **fechado**.

## 4. Regras de PostgreSQL que valem para qualquer schema

- Id de todo modelo: `id String @id @default(cuid())`.
- Campo de relação é `String` puro. Escalar que parece id mas **não** é relação é `String?` puro,
  resolvido e validado em código — e isso é decisão deliberada, comentada no schema.
- **Cascata dirigida por FK** (`onDelete: Cascade`), nunca por transação de deletes manuais.
  `SetNull` onde apagar o pai não deve apagar o filho (registro histórico/público que sobrevive).
- Cada modelo tem **comentário de documentação no próprio `schema.prisma`** explicando o papel e as
  decisões não óbvias.
- Contador atômico: `{ increment: 1 }`, nunca ler-e-somar.
- Escopo de tenant/dono **sempre no `where`**. Vale também para id que só vira vínculo.

## 5. Migrations — a fonte da verdade

- Mudança de schema é **migration versionada** em `prisma/migrations/`; commite sempre.
  `npm run db:migrate -- --name <desc>` cria, aplica e regenera o client.
- **NUNCA edite o SQL de uma migration já aplicada em qualquer lugar** — nem para corrigir bug, nem
  para torná-la idempotente. O Prisma grava o checksum do arquivo em `_prisma_migrations` no momento
  em que aplica; editar depois o invalida em toda máquina que já rodou, e aí `migrate dev` exige
  reset local completo (perda de dados reais) e `migrate deploy` quebra o build de produção.
  **Precisa consertar? Escreva uma migration NOVA que corrija para a frente**, mesmo que o histórico
  fique feio. Vale com força extra para migration que falhou **parcialmente** contra conexão pooled
  (o pooler não envolve o `.sql` inteiro numa transação): a retentativa guardada
  (`IF EXISTS`/`IF NOT EXISTS`/`DO $$ … END $$`) é uma migration nova.
- **Toda migration precisa aplicar do zero, em ordem, num banco vazio** — é o que acontece num
  ambiente novo e numa recuperação de desastre.
- **Remodelar dados reais são 3 passos, nunca uma migration só:** (1) migration **aditiva** (colunas
  novas anuláveis/com default convivendo com as antigas); (2) **script de backfill** em `scripts/`;
  (3) migration **finalize** (derruba as antigas, aperta as novas para `NOT NULL`). A finalize fica
  fora do deploy (PR separado) até o backfill estar confirmado em produção, porque o `migrate deploy`
  do build aplica todas as pendentes de uma vez. Enquanto o passo 2 existir, o script lê as colunas
  condenadas por `$queryRaw`, nunca pela API tipada, e é apagado junto com a finalize (o `tsconfig`
  inclui `scripts/`, então um script órfão quebraria o `next build`).
- **`prisma migrate deploy` (build) é o único caminho de schema para produção.** Nunca
  `prisma db push` nem `ALTER TABLE` manual contra produção.

Escreva um ADR ("migration aplicada é imutável") ao adotar o Prisma — é a decisão que mais custa a quem
a ignora.

## 6. Segurança de dados (inegociável quando há tenants ou dados reais)

Acrescente ao `CLAUDE.md` raiz a seção "Produção e segurança de dados":

- **Nunca rode comando destrutivo** (`prisma migrate reset`, `DROP`/`TRUNCATE`, `DELETE`/`UPDATE` sem
  `WHERE`, `redis.flushdb`) **sem antes confirmar em voz alta qual `DATABASE_URL`/`REDIS_URL` está
  ativo.** Na dúvida, não rode — pergunte.
- `prisma migrate reset`, `git push --force` e qualquer script de bulk delete/update exigem
  **confirmação explícita a cada vez.** Aprovação anterior nunca vale para a próxima.
- Acrescente `docs/operations/pending-migrations.md` se alguma migration `finalize` ficar segurada.

## pg preso em 8.18.0

Com `pg` ≥ 8.19, o `@prisma/adapter-pg` dispara um `DeprecationWarning` em **toda** leitura que
envolva muitas relações (bug do adapter: Prisma #29407 / #29646). `overrides: { "pg": "8.18.0" }`
resolve. **Não** "resolva" envolvendo o `Promise.all` da página num `$transaction` — isso afunila
tudo numa conexão e piora. Remova o override quando a correção sair e **registre-o como ADR** com a
condição de revisão ("revisar quando o bug upstream for corrigido").

## `npm audit` com Prisma

`prisma` e `@prisma/config` trazem transitivas (`mysql2`, `deepmerge-ts`) que podem aparecer no
`npm audit` sem correção publicada. **Antes** de aceitar o downgrade que `npm audit fix --force`
propõe, rode `--dry-run`: já aconteceu de ele continuar vulnerável **e** remover pacotes em uso. Se for
o caso, é exceção aceita por escrito num ADR, não decisão silenciosa — a política está em
[dependências](../operations/dependencies.md).

## 7. Documentação a atualizar

- `src/services/CLAUDE.md`: o catálogo de serviços e a regra de escopo no `where`.
- `src/lib/CLAUDE.md`: as linhas de `prisma` e `redis` na tabela de singletons.
- `scripts/CLAUDE.md`: o `dev.mjs` e o `postinstall.mjs`.
- `docs/operations/dev-environment.md`: o que o `npm run dev` passa a subir.
- `docs/architecture.md`: a camada de serviços deixa de ser "reservada" e a fronteira "nunca tocam
  banco" ganha o cliente real.
