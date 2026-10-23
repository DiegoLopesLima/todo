# 0007 — Recorrência por série com ocorrências reais geradas de forma idempotente

**Status:** vigente

## Contexto

O produto pede que um item como "Code review" reapareça todo dia e que, se a pessoa não o fez ontem, o
de ontem **continue na lista** junto com o de hoje, cada um com a sua data. Cada ocorrência precisa
poder ser concluída, ter subitens, ser editada, reordenada, desfeita e aparecer no histórico.

## Decisão

- Uma **série** (`Series`) guarda a regra, o início, o fim opcional e um molde (texto, prioridade e
  subárvore). Ela **não é um item**: não aparece na árvore, então não quebra filtros, progresso nem
  arrasto.
- Cada ocorrência é um **item de verdade**, com id determinístico `${série}:${data}` (filhos:
  `…:${n}`). `materializeDue` gera as que faltam entre o cursor e hoje, **sem duplicar** se rodar de
  novo ou em duas abas, e só avança o cursor.
- O alcance ("ao abrir, ao virar o dia, ao voltar à aba") é limitado: no máximo 31 por série e 200 por
  execução (as mais recentes); o excedente vira um evento "puladas" e um aviso.
- O **cursor fica fora do desfazer**: desfazer nunca o rebobina, senão uma ocorrência excluída
  renasceria na geração seguinte.
- Datas são `YYYY-MM-DD` locais (sem fuso). A recorrência é própria, em aritmética de inteiros; ver
  [contexto](../modules/todo/context-recurrence.md).

## Alternativas descartadas

- **Ocorrências virtuais calculadas na tela.** Exigem um mapa de conclusões por série e não suportam
  subitens por dia, editar um dia isolado nem histórico por ocorrência.
- **Reiniciar o mesmo item (estilo hábito).** Perde a data de cada conclusão e a reordenação por dia.
- **A biblioteca `rrule`.** Pesada, parada desde 2023 e com datas "flutuantes" tratadas como UTC — a
  fonte clássica de bugs de horário de verão. O subconjunto que o produto usa é pequeno.

## Consequências

- Excluir uma ocorrência é definitivo para aquele dia (o cursor já passou).
- Importar um arquivo sem os cursores pode regerar as últimas ocorrências (até o teto), sem duplicar.
