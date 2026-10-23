# 0009 — Desfazer por patches em memória e histórico só-acrescenta

**Status:** vigente

## Contexto

Ctrl/⌘+Z precisa desfazer **qualquer** alteração, em ordem, e refazer. Separadamente, a pessoa quer
consultar quando cada item foi criado, marcado ou movido. As duas coisas são parecidas e diferentes.

## Decisão

- Toda mudança passa por `runCommand`, que devolve o próximo documento e um **patch** (`antes/depois`
  por chave de `items`, `series` e `clearedDays`). Desfazer aplica o patch invertido; refazer, o
  original. Os cursores de geração ficam de fora do patch.
- As pilhas de desfazer/refazer vivem **só em memória** (até 100 passos) e são zeradas ao recarregar a
  página e ao receber uma alteração de outra aba — os passos se referem a um documento que deixou de
  valer.
- O histórico é **persistido e só acrescenta**. Desfazer não apaga o registro original: acrescenta um
  registro "desfeito" com a referência do original (e "refeito" ao refazer). A interface marca o
  original como desfeito. A poda por idade (180 dias) e por quantidade (2.000) é a única forma de um
  registro sumir.
- Depois de aplicar um patch, o invariante pai↔filhos é restaurado (uma ocorrência gerada entre o passo
  e o desfazer não pode deixar um pai concluído com filho aberto).

## Alternativas descartadas

- **`zundo` / snapshots do documento inteiro.** Guardam o estado todo por passo e brigam com o `persist`.
- **`immer` só para patches.** Uma dependência grande para um diff por referência de ~100 linhas.
- **Persistir a pilha de desfazer.** Exigiria reconciliar passos antigos com mudanças de outras abas.

## Consequências

- O patch depende de os redutores **preservarem a identidade** do que não muda (o teste cobre isso).
- Uma ação de vários itens (concluir um pai com cinco filhos) é um passo só, mas gera um evento de
  histórico por item que mudou — o histórico responde "quando este filho foi concluído".
