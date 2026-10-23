# 0001 — Conhecimento do projeto vive em `docs/`, indexado e recuperado sob demanda

**Status:** vigente · **Índice:** [docs/README.md](../README.md)

## Contexto

Um projeto que acumula regras de negócio, contexto histórico e decisões num ou dois arquivos
gigantes cria um custo que ninguém percebe até doer: para recuperar **uma** regra, o agente (ou a
pessoa) lê o arquivo inteiro, ou recorta por offset manual. Pior é o `CLAUDE.md` inchado — ele é
carregado automaticamente a cada sessão ou edição na pasta, então cada linha de narrativa ali é
imposto de token cobrado para sempre.

Três fatos da documentação oficial do Claude Code moldam a solução: `CLAUDE.md` carrega em toda
sessão (alvo < 200 linhas); `@caminho` num `CLAUDE.md` é import **eager**, o oposto de recuperação
sob demanda; `CLAUDE.md` de subpasta e skills carregam sob demanda.

## Decisão

Quatro camadas com fronteira explícita:

| Camada | Fonte de verdade de | Carga |
|---|---|---|
| Código + TSDoc | **a realidade**: como está implementado | sob demanda |
| `docs/` | regras, contexto, decisões, operação | **sob demanda, via índice** |
| `CLAUDE.md` | instrução operacional automática | automática |
| RTK | compressão do *output* de comandos | hook global |

O conhecimento vive em arquivos pequenos em `docs/modules/<module>/`, nomeados por convenção
(`rules*.md`, `context*.md`) para que o caminho seja adivinhável sem consultar o índice.
`docs/README.md` é o ponto único de manutenção do roteamento. O Obsidian é a interface humana sobre
a mesma pasta de Markdown; a vault é a raiz do repositório.

`npm run docs:check` valida o que dá para validar mecanicamente: link quebrado, nota órfã,
identificador citado que não existe mais no código e `CLAUDE.md` acima do orçamento.

## Alternativas descartadas

- **Plugin do Obsidian / MCP servindo a vault.** Um servidor a mais para entregar o que `Read` e
  `Grep` já entregam, sem ganho de token. A vault é Markdown em disco; o Obsidian é a interface
  humana sobre ela, não o mecanismo de recuperação.
- **`.claude/rules/` com `paths:`.** Seria um terceiro mecanismo de instrução ao lado do `CLAUDE.md`
  raiz e dos de pasta, resolvendo o que os de pasta já resolvem.
- **Um `RULES.md` único.** É exatamente o arquivo gigante que esta decisão existe para evitar.
- **Frontmatter YAML e `[[wikilinks]]` nas notas.** O resumo de uma linha só rende no índice; dentro
  do arquivo é imposto de token. Wikilinks o Claude não resolve de forma confiável — links Markdown
  relativos funcionam para os dois leitores.

## Consequências

- O conhecimento recuperado por tarefa cai para o tamanho de uma nota, não de um módulo.
- `docs:check` não cobre resumo desatualizado no índice — isso continua sendo disciplina.
- **O código é a fonte da verdade.** Nota que o contradiz é defeito da nota até prova em contrário:
  investigue e corrija na mesma tarefa. Se a nota descreve intenção de produto que o código viola,
  **não apague a regra** (esconderia um bug) — marque e reporte.
- Cada `CLAUDE.md` tem orçamento de 200 linhas e 12 KB (raiz) ou 16 KB (pasta). Estourou? Ou a pasta
  precisa ser dividida, ou o excedente é narrativa que pertence a `docs/` ou a um comentário no código.
