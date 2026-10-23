#!/usr/bin/env node
// Valida a camada de conhecimento (`docs/`) e o orçamento dos `CLAUDE.md`.
// Imprime SÓ falhas — mesma filosofia do RTK: output que não é sinal não vira contexto.
//
// Checa:
//   1. todo link relativo em docs/ e nos CLAUDE.md resolve para um arquivo existente;
//   2. nenhuma nota de docs/ ficou órfã (inalcançável a partir de docs/README.md);
//   3. todo identificador citado em crases existe no código — pega doc que apodreceu
//      porque um símbolo foi renomeado ou removido;
//   4. nenhum CLAUDE.md passa do orçamento (linhas, bytes e tamanho de linha);

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const RAIZ = resolve(import.meta.dirname, '..')
const falhas = []
const falha = (arquivo, msg) => falhas.push(`${relative(RAIZ, arquivo)}: ${msg}`)

const IGNORAR = new Set([
  'node_modules',
  '.next',
  '.swc',
  '.git',
  'storybook-static',
  'coverage',
  'generated',
  '.obsidian',
  'skills',
])

function varrer(dir, filtro, achados = []) {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) varrer(caminho, filtro, achados)
    else if (filtro(nome)) achados.push(caminho)
  }
  return achados
}

const docs = existsSync(join(RAIZ, 'docs'))
  ? varrer(join(RAIZ, 'docs'), (n) => n.endsWith('.md'))
  : []
const claudeMds = varrer(RAIZ, (n) => n === 'CLAUDE.md')

// ── 1. Links relativos ────────────────────────────────────────────────────────
// Ignora links de código (`@/…`), âncoras puras e URLs.
const LINK = /\[[^\]]*\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g

for (const arquivo of [...docs, ...claudeMds]) {
  const texto = readFileSync(arquivo, 'utf8')
  for (const [, href] of texto.matchAll(LINK)) {
    if (/^(https?:|mailto:|#|@\/)/.test(href)) continue
    if (!existsSync(resolve(dirname(arquivo), href.split('#')[0]))) {
      falha(arquivo, `link quebrado → ${href}`)
    }
  }
}

// ── 2. Notas órfãs ────────────────────────────────────────────────────────────
// Alcançabilidade a partir do índice, seguindo os links já coletados.
const indice = join(RAIZ, 'docs', 'README.md')
if (docs.length) {
  const alcancados = new Set([indice])
  const fila = [indice]
  while (fila.length) {
    const atual = fila.pop()
    const texto = readFileSync(atual, 'utf8')
    for (const [, href] of texto.matchAll(LINK)) {
      if (/^(https?:|mailto:|#|@\/)/.test(href)) continue
      const alvo = resolve(dirname(atual), href.split('#')[0])
      if (alvo.endsWith('.md') && existsSync(alvo) && !alcancados.has(alvo)) {
        alcancados.add(alvo)
        fila.push(alvo)
      }
    }
  }
  for (const nota of docs) {
    if (!alcancados.has(nota)) falha(nota, 'nota órfã — nada em docs/README.md leva até ela')
  }
}

// ── 3. Identificadores citados que sumiram do código ──────────────────────────
// Só PascalCase e caminhos `@/…`: são os que identificam símbolo de forma inequívoca.
// camelCase solto dá falso positivo demais (palavras comuns viram identificador).
const CITADO = /`(@\/[\w@/.-]+|[A-Z][A-Za-z0-9]{3,})`/g
// Globais da plataforma e do ecossistema, que nunca aparecem definidos no nosso código.
const EXTERNOS = new Set([
  'DeprecationWarning',
  'TextEncoder',
  'TextDecoder',
  'AxiosInstance',
  'PostgreSQL',
  'TypeScript',
  'JavaScript',
  'Markdown',
  'Regra',
  'Dado',
  'Quando',
  'Então',
  'Cenário',
  'Read',
  'Grep',
  'Write',
  'Edit',
  'Bash',
  // Formas de nome usadas para descrever convenção, não símbolos reais.
  'PascalCaseValues',
  'PascalCase',
  'CamelCase',
])
// Uma linha que diz que algo FOI REMOVIDO ou RENOMEADO cita de propósito um nome que não
// existe mais — é a informação, não o apodrecimento. Só a linha da menção é isenta.
const MENCAO_HISTORICA =
  /\b(remov\w+|remove[d]?|renam\w+|antig[oa]s?|\bold\b|no longer|deixou de|era o|lived here as|doc history|substituíd\w+|replac\w+|earlier|geri\w+|não existe|sem chamador)\b/i

const citados = new Map() // identificador -> primeiro arquivo que o cita

// Receita (`docs/recipes/`) descreve código que AINDA NÃO existe no template — citar ali um
// símbolo futuro (`PrismaClient`, `resolveAuthGate`) é o ponto da nota, não apodrecimento. Os
// links dela continuam checados nas seções 1 e 2.
const RECEITAS = join(RAIZ, 'docs', 'recipes')

for (const arquivo of [...docs, ...claudeMds]) {
  if (arquivo.startsWith(RECEITAS)) continue
  for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
    if (MENCAO_HISTORICA.test(linha)) continue
    for (const [, id] of linha.matchAll(CITADO)) {
      if (EXTERNOS.has(id) || id === id.toUpperCase()) continue
      if (!citados.has(id)) citados.set(id, arquivo)
    }
  }
}

// O código inteiro cabe em memória e é lido uma vez — mais rápido e mais portátil
// que um grep por identificador (`rg` aqui é função de shell, não binário).
const codigo = [
  ...varrer(join(RAIZ, 'src'), (n) => /\.(ts|tsx|mjs|css)$/.test(n)),
  ...varrer(join(RAIZ, 'scripts'), (n) => /\.(ts|mjs)$/.test(n)),
  join(RAIZ, 'prisma/schema.prisma'),
  join(RAIZ, 'package.json'),
  join(RAIZ, 'next.config.ts'),
]
  .filter(existsSync)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

for (const [id, arquivo] of citados) {
  // `@/x/y` é alias de `src/x/y`: procura o arquivo, não o texto.
  if (id.startsWith('@/')) {
    const base = join(RAIZ, 'src', id.slice(2))
    const existe = ['', '.ts', '.tsx', '.css', '/index.ts', '/index.tsx'].some((ext) =>
      existsSync(base + ext)
    )
    if (!existe) falha(arquivo, `caminho citado não existe → \`${id}\``)
    continue
  }
  if (!codigo.includes(id)) {
    falha(arquivo, `identificador citado não existe mais no código → \`${id}\``)
  }
}

// ── 4. Orçamento dos CLAUDE.md ────────────────────────────────────────────────
// Escopos com custos diferentes merecem limites diferentes: a raiz entra em TODA
// sessão (limite da doc oficial do Claude Code: 200 linhas); as de pasta só quando
// se toca a pasta. Em ambos, bytes dizem mais que linhas — mas o que realmente
// machuca é a linha gigante: uma célula de tabela de 1 KB não pode ser lida pela
// metade, então ou se paga tudo ou nada. Daí o teto por linha.
const ORCAMENTO = {
  raiz: { linhas: 200, bytes: 12 * 1024 },
  pasta: { linhas: 200, bytes: 16 * 1024 },
}
// 900 é onde uma célula de tabela deixa de ser catálogo e vira ensaio: acima disso o
// texto não pode mais ser lido pela metade, e o excedente costuma ser racional de
// decisão — que pertence a `docs/`, não a um arquivo carregado automaticamente.
const MAX_LINHA = 900

for (const arquivo of claudeMds) {
  const ehRaiz = arquivo === join(RAIZ, 'CLAUDE.md')
  const teto = ehRaiz ? ORCAMENTO.raiz : ORCAMENTO.pasta
  const texto = readFileSync(arquivo, 'utf8')
  const linhas = texto.split('\n')
  const bytes = Buffer.byteLength(texto)

  if (linhas.length > teto.linhas)
    falha(arquivo, `${linhas.length} linhas (orçamento: ${teto.linhas})`)
  if (bytes > teto.bytes) {
    falha(arquivo, `${(bytes / 1024).toFixed(1)} KB (orçamento: ${teto.bytes / 1024} KB)`)
  }
  linhas.forEach((linha, i) => {
    if (linha.length > MAX_LINHA) {
      falha(arquivo, `linha ${i + 1} tem ${linha.length} caracteres (máx. ${MAX_LINHA}) — quebre-a`)
    }
  })
}

// ── Saída ─────────────────────────────────────────────────────────────────────
if (falhas.length) {
  console.error(falhas.join('\n'))
  process.exit(1)
}
