import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

// Por quê: dentro do Dev Container o gargalo é MEMÓRIA, não CPU — e `maxWorkers` dimensionado por
// CPU ignora isso. Uma VM WSL2 costuma expor muitas CPUs mas só ~8 GB de RAM e **swap zero**, e o
// container roda sem limite de memória no cgroup. Cada worker jsdom chega a centenas de MB de RSS
// (React 19 + Next + next-intl carregados por worker); com `'50%'` das CPUs a soma passa da RAM da
// VM. Sem swap, o OOM killer age na VM inteira e escolhe a vítima por `oom_score` — o maior score é
// o `vscode-server`, e é por isso que o sintoma aparece como "o Dev Container perdeu a conexão", não
// como um erro do Node. Com 4 workers a mesma suíte cabe com folga, e fica mais rápida, porque
// workers demais competindo por memória e cache é thrashing, não paralelismo. Diagnóstico completo:
// docs/operations/dev-environment.md.
//
// O fluxo do host (husky `pre-push` → `npm test`) roda fora do container, com a RAM do sistema
// inteira — lá o dimensionamento por CPU nunca foi problema, então ele fica como estava.
// `DEVCONTAINER=true` vem do `.devcontainer/Dockerfile` e é o que distingue os dois ambientes.
const inDevcontainer = process.env.DEVCONTAINER === 'true'

const config: Config = {
  testEnvironment: 'jsdom',
  maxWorkers: process.env.JEST_WORKERS ?? (inDevcontainer ? 4 : '50%'),
  // O Jest checa o RSS do worker ENTRE um arquivo de teste e outro e recicla o que passar daqui —
  // não é teto instantâneo, e sim o freio que impede o crescimento acumulado ao longo da suíte. Sem
  // ele o `--max-old-space-size` herdado do container vira o único limite, e ele é um TETO de heap,
  // não um alvo: o V8 adia GC até perto dele.
  ...(inDevcontainer ? { workerIdleMemoryLimit: '640MB' } : {}),
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Base UI's portalled menus/positioner are slow under jsdom; give interaction tests headroom so
  // they don't time out (especially when run in parallel).
  testTimeout: 20000,
  // The `@/*` alias from tsconfig isn't auto-mapped by next/jest here (there's no `baseUrl`), so
  // map it explicitly for module resolution in tests.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Por quê: sem isto o Jest só instrumenta o que algum teste IMPORTOU, então um arquivo sem teste
  // nenhum simplesmente não entra na conta — o número subiria justamente por causa do que faltava.
  // Declarando o universo aqui, um arquivo novo sem teste passa a puxar a métrica para baixo, que é
  // o comportamento útil.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.tsx',
    '!src/**/*.d.ts',
    // Dados estáticos e o registro de ícones não têm lógica para cobrir.
    '!src/lib/icon-data/**',
  ],
  // Piso de cobertura. Só vale em execução com `--coverage` — o `jest` do `pre-push` não é afetado.
  //
  // **Formato:** no Jest, uma chave em forma de DIRETÓRIO agrega os arquivos dentro dele; uma chave
  // em forma de GLOB aplica o limiar a cada arquivo individualmente. Por isso só diretórios aqui. A
  // política por camada que o Jest não sabe agrupar (Server Actions e Route Handlers, espalhados sob
  // `src/app/`) é verificada por `scripts/check-coverage-layers.mjs` — ver `npm run coverage`.
  //
  // Suba os pisos conforme o app cresce: onde o defeito é caro e silencioso — regra de negócio,
  // autorização, cobrança — o piso deve ser alto; a UI não tem piso próprio, o alvo dela é
  // comportamento, não percentual. Uma chave de diretório sem nenhum arquivo ainda (ex.:
  // `./src/services/`) faz o Jest reclamar — acrescente-a quando a pasta ganhar código.
  coverageThreshold: {
    './src/lib/': { statements: 80, branches: 70, functions: 80, lines: 80 },
    // Regra de negócio do módulo de tarefas: é onde o defeito é caro e silencioso (perder ou duplicar
    // dado, errar o dia de uma repetição), então o piso é alto. Medido: ~97/90/99/98 e ~93/86/86/92.
    './src/lib/todo/': { statements: 90, branches: 82, functions: 92, lines: 92 },
    './src/store/': { statements: 85, branches: 75, functions: 78, lines: 85 },
    './src/services/': { statements: 90, branches: 85, functions: 90, lines: 90 },
    // O resto é dominado por primitivos de UI sem teste próprio (instalados do ShadCN/coss): o piso
    // existe só para impedir queda brusca. Suba-o conforme o app ganhar código testado.
    global: { statements: 40, branches: 40, functions: 35, lines: 40 },
  },
}

// next/jest APPENDS its own `transformIgnorePatterns` (which ignores every node_module except a
// short allow-list). Because a file is left untransformed if it matches ANY pattern, appending our
// own can't "un-ignore" the ESM-only packages (next-intl, nuqs, …). So we override the array
// entirely after next/jest builds the config, whitelisting those packages for transpilation.
// Pacote novo que quebrar com "Cannot use import statement outside a module" entra aqui.
export default async (): Promise<Config> => {
  const jestConfig = await createJestConfig(config)()

  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(next-intl|use-intl|@formatjs|intl-messageformat|nuqs|fractional-indexing|idb-keyval)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ]

  return jestConfig
}
