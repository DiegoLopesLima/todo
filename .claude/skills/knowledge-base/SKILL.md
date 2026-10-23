---
name: knowledge-base
description: Consultar e manter a base de conhecimento do projeto em docs/. Use ao procurar regras de negócio, contexto ou decisões de um módulo; ao registrar uma decisão arquitetural (ADR); ao atualizar documentação depois de mudar arquitetura, regra, integração ou comportamento de feature; e quando documentação e código discordarem.
---

# Base de conhecimento (`docs/`)

## Recuperar

1. Abra `docs/README.md` e leia **só** o arquivo que a tabela indicar.
2. O caminho é adivinhável — `docs/modules/<module>/rules*.md` e `context*.md`. Se você já sabe o
   módulo, vá direto; o índice é desempate, não pedágio.
3. Leia o código depois, para validar ou implementar — não para redescobrir o que a nota já diz.
4. Tarefa que não toca regra, comportamento nem "por que isto é assim" **não precisa de `docs/`**.

## Onde cada fato mora

| O fato é… | Vai para |
|---|---|
| como está implementado | o código (não documente) |
| por que **este trecho** é assim | comentário `// Por quê:` ao lado dele |
| comportamento esperado do produto | `docs/modules/<module>/rules*.md`, em BDD |
| racional, histórico, alternativa descartada, causa-raiz de bug corrigido | `docs/modules/<module>/context*.md` |
| decisão técnica com consequência duradoura | `docs/decisions/NNNN-*.md` |
| runbook, política, diagnóstico de ambiente | `docs/operations/` |
| o que o Claude deve **fazer** automaticamente | `CLAUDE.md` da pasta |

Na dúvida entre regra e contexto: **regra** responde "o que deve acontecer"; **contexto** responde
"por que foi feito assim". Se a explicação cabe ao lado do código que ela justifica, é comentário.

## Quando atualizar — e quando não

Atualize **na mesma tarefa** quando a mudança alterar arquitetura, decisão técnica, integração,
convenção, comportamento de uma feature, ou tornar falso algo já documentado.

Não documente renomeação sem mudança de comportamento, ajuste visual, refatoração interna que
preserva o contrato, nem correção de bug que só restaura o comportamento já documentado.

## Quando doc e código discordam

O código é a realidade. Investigue antes de escolher:

1. **Código certo, doc errada** ⇒ corrija a doc e registre a divergência no
   [ADR 0001](../../../docs/decisions/0001-knowledge-layer-in-docs.md).
2. **Doc descreve intenção de produto que o código viola** ⇒ **não apague a regra** — isso esconderia
   um bug. Mantenha, marque como possível defeito e reporte no resumo.
3. **Duas notas discordam e o código não desempata** (comportamento que só se confirma rodando o
   app) ⇒ marque e pergunte. Não invente o desempate.

## Anti-corrupção

- **Não registre suposição como fato.** Não verificou? Ou verifica, ou escreve `⚠️ não verificado:`
  com o que falta checar.
- **Toda afirmação sobre o código deve ser rastreável** a um arquivo ou símbolo nomeado — é o que
  permite ao `npm run docs:check` detectar quando ela apodrece.
- **Não duplique: linke.** Fato que já existe em outra nota vira link, nunca cópia. Duas cópias
  divergem, e aí nenhuma é confiável.
- **Documentação obsoleta se corrige ou se apaga**, nunca convive com a versão nova.
- **Informação temporária ou experimental** leva marca explícita e uma condição de saída verificável.
- **Não edite nota só para "mantê-la ocupada".** Mudança sem fato novo é ruído.
- Arquivo grande demais é sinal de fronteira errada: divida por assunto, não por tamanho.

## Registrar um ADR

Próximo número livre em `docs/decisions/`, e uma linha nova na tabela do `README.md` de lá.

```markdown
# NNNN — <decisão em uma frase afirmativa>

**Status:** vigente | substituída por NNNN | revisar quando <condição verificável>

## Contexto
O que forçava uma escolha. Fatos, não narrativa.

## Decisão
O que foi decidido, no presente.

## Alternativas descartadas
Cada uma com o motivo. É a parte que mais rende depois.

## Consequências
O que se paga por isso, e o que quebra se alguém reverter sem saber.
```

ADR **não se reescreve**. Mudou? Escreva uma nova e marque a antiga como substituída.

## Validar

`npm run docs:check` — links quebrados, notas órfãs, identificadores citados que não existem mais no
código, limites numéricos sem constante correspondente e `CLAUDE.md` acima do orçamento. Imprime só
falhas.
