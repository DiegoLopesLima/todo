# 0002 — `Select` removido; todo controle de seleção é o `Combobox` do coss

**Status:** vigente · **Regra operacional:** `src/components/CLAUDE.md`

## Contexto

O `Select` do ShadCN renderizava de forma instável. A ausência de `src/components/ui/select.tsx` é
proposital — não é um componente que ainda não foi instalado.

## Decisão

Todo controle de seleção usa o `Combobox` do coss.com/ui: seleção única e múltipla (com chips).

## Alternativas descartadas

- **Manter o `Select` para os casos simples.** Duas primitivas de seleção convivendo garantem que a
  instável reapareça em tela nova, e o `Combobox` já é pesquisável — cobre o caso simples sem perda.

## Consequências

- Um `Combobox` pesquisável em lugar onde um `Select` bastaria é aceito de propósito.
- Paleta de comandos ancorada a um texto (o componente de comandos `cmdk` do ShadCN) e campo de seleção de formulário são
  categorias de componente diferentes; a primeira **não** é exceção a esta decisão.
- Quem for reinstalar um `Select` vai encontrar o arquivo ausente e presumir esquecimento. É por isso
  que esta decisão está escrita.
