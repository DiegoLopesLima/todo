# Ambiente de desenvolvimento — como destravar

Diagnóstico das armadilhas do ambiente: o app roda **nativo no host** (Windows/macOS/Linux), e o Dev
Container existe para o **Claude Code** trabalhar isolado (testes, `tsc`, lint) sobre o mesmo
código, num bind mount. O catálogo dos scripts e as regras duras estão em
[`scripts/CLAUDE.md`](../../scripts/CLAUDE.md).

> **O Claude Code não consegue rodar este app.** O sandbox não tem navegador, e o dev server em
> primeiro plano nunca devolve o controle. Este arquivo existe para reconhecer o sintoma e indicar a
> correção — quem executa é a pessoa, no ambiente dela. O hook
> `.claude/hooks/block-long-running-bash.mjs` bloqueia esses comandos no sandbox.

## Rodar o app

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3000 → redireciona para /pt-BR
```

`npm run dev` é só o `next dev`. Quando o app ganhar banco/cache, o dev server **continua nativo** e
a infraestrutura sobe em contêiner — ver a [receita de banco de dados](../recipes/database.md).

> **Subdomínios em desenvolvimento.** Se o app vier a ter um subdomínio por cliente, abra-o em
> `http://lvh.me:3000` em vez de `localhost`: `lvh.me` e `*.lvh.me` resolvem para `127.0.0.1`, sem tocar
> no `/etc/hosts`. Nesse caso adicione `allowedDevOrigins: ['lvh.me', '*.lvh.me']` ao `next.config.ts`,
> senão o Next bloqueia o HMR por origem cruzada.

## Por que o dev server do Next não roda em container

O código-fonte fica num bind mount servido pelo Windows (Docker Desktop / WSL 9p). Rodar o dev server
lá dentro força polling de filesystem que trava o host e produz 404 por manifesto obsoleto. Nativo no
host resolve. **Nunca mova o servidor de dev para um container.**

## Binários nativos Linux faltando → `npm run fix:native`

**A correção única para a classe inteira.** Host Windows e container Linux compartilham um só
`node_modules` (WSL2); pacote nativo entrega o binário compilado como pacote opcional por SO, e um
`npm i` no host instala **só os de win32** — então, no container, todo módulo nativo falha ao carregar.

Não é um pacote: o conjunto afetado inclui `@parcel/watcher`, `@swc/core`, `@next/swc`,
`@unrs/resolver`, `@oxc-resolver`, `@tailwindcss/oxide`, `lightningcss`, `@esbuild` e `@biomejs/cli`.
Sintomas, mesma raiz:

| Sintoma | Onde aparece |
|---|---|
| `Failed to parse the TypeScript config file jest.config.ts`, `No prebuild or local build of @parcel/watcher found`, `jest.setup.ts not found` | Jest (o `@parcel/watcher` chega via next-intl) |
| `Failed to load next.config.ts` → rotas aninhadas caindo no catch-all → 404 | `next dev` / `next build` |
| `MODULE_NOT_FOUND` para `@biomejs/cli-linux-x64` | Biome |

`npm run fix:native` varre o `node_modules` atrás de diretórios nativos win32, faz `npm pack` do
pacote `linux-x64-gnu`/`-glibc` correspondente na versão exata instalada e extrai — **sem
`npm install`**, para nunca podar os binários win32 do host nem escrever os symlinks de `.bin` que
depois quebram o host. É idempotente, e cada chamada tem timeout de 30 s, para um soluço de rede
falhar rápido em vez de pendurar o `pretest`. Roda sozinho antes de `npm test`.

**Não** persiga o pacote individual, **não** edite `jest.config.ts`/`next.config.ts` (eles estão
certos) e **não** rode `npm install` dentro do container.

## 404 de desenvolvimento

- **404 padrão do Next em toda rota, inclusive a home** = `.next` obsoleto ou pertencente ao root, de
  uma execução anterior. Limpe (`rm -rf .next`, com `sudo` se for do root).
- **Rotas 404 de forma intermitente e reiniciar não resolve** = corrupção do cache persistente de
  filesystem do Turbopack. Reiniciar não adianta (o cache é feito para sobreviver a reinício); só
  apagar resolve. Já mitigado por `experimental.turbopackFileSystemCacheForDev: false` no
  `next.config.ts` — não reative sem confirmar que o upstream corrigiu.
- **Nunca "conserte" um 404 apagando, renomeando ou achatando a rota/layout** — é cache, não roteamento.

## Página carrega para sempre e nada aparece no terminal do Next

O auto port-forwarding do VS Code cria um listener em `127.0.0.1:3000`, mais específico que o
`0.0.0.0` do Next, e **engole** as requisições de `localhost`. Já mitigado em `.vscode/settings.json`
(`remote.autoForwardPorts: false`). Se voltar, olhe quem é dono da porta antes de culpar o código:
`netstat -ano | findstr :3000` (Windows) ou `ss -ltnp | grep 3000`.

## Dev Container caindo ao rodar a suíte → era OOM, não "Docker travado"

**Sintoma:** rodar `npm run test` dentro do Dev Container derruba a conexão do VS Code. O ambiente
fica inutilizável, sobram processos para matar na mão. O mesmo `npm test` disparado pelo `pre-push`
**no host** nunca falha.

**Causa:** estouro de memória da VM WSL2 — não um travamento do Docker. Uma VM típica tem ~8 GB de
RAM e **swap = 0**, e o container roda sem limite de memória no cgroup. Cada worker jsdom pesa
centenas de MB (React 19 + Next + next-intl por worker); `maxWorkers` dimensionado por CPU (`'50%'` de
16 CPUs = 8 workers) pede mais RAM do que a VM tem. Sem swap, o kernel não tem para onde empurrar a
pressão: o OOM killer dispara e escolhe a vítima por `oom_score` — e o maior score do container é o
**`vscode-server`**, à frente do próprio agente. Por isso o sintoma é "o Dev Container caiu" e não o
`JavaScript heap out of memory` que um estouro de heap do Node produziria.

**O erro de configuração era dimensionar `maxWorkers` por CPU numa máquina cujo gargalo é RAM.**

**Correções já no template:**

- `jest.config.ts` — `maxWorkers` derivado do orçamento de memória (4) **só dentro do container**,
  detectado por `DEVCONTAINER=true` (vem do `.devcontainer/Dockerfile`); o host mantém `'50%'`. Mais
  `workerIdleMemoryLimit: '640MB'`, que recicla o worker que passar do teto entre um arquivo e outro.
  `JEST_WORKERS` sobrescreve — **não mexa** sem medir.
- `.devcontainer/devcontainer.json` — `NODE_OPTIONS=--max-old-space-size=2048` (o teto é herdado por
  cada worker; 4096 adiava o GC do V8 além do que a RAM comporta) e `--init` nos `runArgs`, para o
  PID 1 reapar os órfãos que sobravam quando uma árvore de processos morria pela metade.

> As mudanças no `devcontainer.json` só valem **após rebuild do container** (*Dev Containers: Rebuild
> Container*). As do `jest.config.ts` valem na hora.

**Um comando pesado por vez:** `test`, `tsc`, `lint` e `build` juntos estouram a RAM pelo mesmo
motivo. Se voltar a acontecer, o próximo passo é no host: dar swap à VM WSL2 (`.wslconfig` com
`swap=4GB`), que transforma pressão de memória em lentidão em vez de morte de processo.

## Relacionado

- [arquitetura do sistema](../architecture.md)
- [bootstrapping](bootstrapping.md) — o que fazer ao copiar o template
