#!/usr/bin/env node
// Verifica a política de cobertura POR CAMADA, que o `coverageThreshold` do Jest
// não consegue expressar sozinho.
//
// Por quê este script existe: no Jest, uma chave de `coverageThreshold` em forma
// de diretório agrega; em forma de glob, aplica o limiar a cada arquivo
// isoladamente. Server Actions e Route Handlers não moram num diretório só (são
// `actions.ts`/`route.ts` espalhados sob `src/app/`), então só um glob os
// alcançaria — e aí um único arquivo fino reprovaria a camada inteira. Aqui o
// agregado é calculado à mão, que é o que a política realmente quer dizer.
//
// A ideia da política: onde o defeito é caro e silencioso — regra de negócio,
// autorização, escopo de dono, cobrança — o piso é alto. A UI não tem piso
// próprio: dois terços do código não coberto são componentes, e persegui-los
// empurraria o esforço para teste de renderização em vez de comportamento.
//
// Lê `coverage/coverage-summary.json`, então rode depois de `jest --coverage`
// com o reporter `json-summary` (é o que `npm run coverage` faz).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUMMARY = join(process.cwd(), 'coverage/coverage-summary.json')

/** Cada camada: como reconhecê-la e o piso que ela precisa sustentar. */
const LAYERS = [
  {
    name: 'Server Actions',
    // `actions.ts` ao lado de uma rota E os `*-actions.ts` avulsos (`subscription-actions`,
    // `presence-actions`, `auth-actions`, …) — os dois são Server Actions.
    match: (file) => /(^|\/)([a-z-]+-)?actions\.ts$/.test(file),
    floor: { statements: 84, branches: 74, functions: 85, lines: 88 },
  },
  {
    name: 'Route Handlers',
    match: (file) => file.endsWith('/route.ts'),
    floor: { statements: 85, branches: 78, functions: 88, lines: 93 },
  },
]

/** O alvo declarado para as camadas de risco, para o relatório mostrar a distância. */
const TARGET = 85

let summary
try {
  summary = JSON.parse(readFileSync(SUMMARY, 'utf8'))
} catch {
  console.error(
    `[coverage] ${SUMMARY} não encontrado — rode \`npm run coverage\` (jest --coverage com o reporter json-summary).`
  )
  process.exit(1)
}

const files = Object.entries(summary).filter(([key]) => key !== 'total')
const METRICS = ['statements', 'branches', 'functions', 'lines']

let failed = false

for (const layer of LAYERS) {
  const rows = files.filter(([file]) => layer.match(file))
  if (rows.length === 0) {
    // Num app recém-criado ainda não há Server Action; a camada passa a valer quando o primeiro
    // arquivo aparecer. Se o app já tem `actions.ts`/`route.ts` e a camada segue vazia, o padrão
    // de `match` acima é que está quebrado.
    console.warn(`[coverage] camada "${layer.name}" sem arquivo — ignorada por ora.`)
    continue
  }

  const parts = []
  for (const metric of METRICS) {
    const covered = rows.reduce((sum, [, m]) => sum + m[metric].covered, 0)
    const total = rows.reduce((sum, [, m]) => sum + m[metric].total, 0)
    const pct = total === 0 ? 100 : (100 * covered) / total
    const floor = layer.floor[metric]
    const ok = pct >= floor
    if (!ok) failed = true
    parts.push(`${metric} ${pct.toFixed(1)}%${ok ? '' : ` < ${floor}% ✗`}`)
  }

  const statements = (() => {
    const covered = rows.reduce((sum, [, m]) => sum + m.statements.covered, 0)
    const total = rows.reduce((sum, [, m]) => sum + m.statements.total, 0)
    return total === 0 ? 100 : (100 * covered) / total
  })()
  const gap =
    statements >= TARGET ? '' : ` (alvo ${TARGET}%: faltam ${(TARGET - statements).toFixed(1)}pp)`

  console.log(`${layer.name.padEnd(16)} ${rows.length} arquivos · ${parts.join(' · ')}${gap}`)
}

if (failed) {
  console.error('\n[coverage] uma camada ficou abaixo do piso.')
  process.exit(1)
}
console.log('\n[coverage] todas as camadas dentro do piso.')
