# 0006 — Arrastar e soltar com `@dnd-kit/core`, atrás de uma função de destino pura

**Status:** vigente · revisar quando o `@dnd-kit/react` chegar à versão 1.0

## Contexto

A lista é uma árvore: o item arrastado pode mudar de posição, entrar em outro item (virar filho) ou
subir um nível, e levar os subitens consigo. Tem de funcionar com mouse e com toque, rolar a página
sem ser sequestrado pelo gesto, e ter equivalente sem arrastar (acessibilidade).

## Decisão

- Usar `@dnd-kit/core` + `@dnd-kit/sortable` (a linha estável, 6.x/10.x) com **só o `PointerSensor`**.
  O arrasto começa **apenas pela alça** (`touch-action: none` nela), então o gesto de rolar a lista no
  celular nunca é tomado. Não há sensor de teclado do dnd-kit: o teclado tem comandos próprios (Alt+setas,
  "Mover para…").
- **Toda a regra de destino mora numa função pura**, `resolveDrop` (`src/lib/todo/drop.ts`): recebe as
  linhas visíveis, o item ativo, a linha sob o ponteiro e o deslocamento horizontal, e devolve o pai, a
  prioridade e o rank. A projeção de nível pelo deslocamento X segue a receita de árvore do dnd-kit. O
  adaptador (`TodoList`) só traduz eventos nela — trocar de biblioteca não toca a regra.
- Teclado e menu usam os mesmos planejadores de movimento (`src/lib/todo/move-plans.ts`), que reaproveitam
  as regras de ordem do arrasto, para os dois caminhos nunca divergirem.

## Alternativas descartadas

- **`@dnd-kit/react` (0.x).** Ativo, mas pré-1.0; não consegui verificar um exemplo de árvore nem a
  maturidade com React 19.
- **`pragmatic-drag-and-drop` (Atlassian).** O `tree-item` hitbox é ótimo, mas usa o arrastar nativo do
  HTML5, que no toque do iOS exige pressão longa e não deixa controlar o preview.
- **Biblioteca de árvore pronta.** Acoplaria o modelo de dados (rank por faixa de prioridade) ao
  formato da biblioteca.

## Consequências

- O arrasto real **não é testável no jsdom** (não há layout): o que se testa é `resolveDrop`, a alça e
  as condições em que ela existe. A conferência de mouse e toque reais é humana.
- Durante o arrasto as linhas desligam a animação de layout (`motion`), senão dois donos do mesmo
  `transform` brigam.
- Os subitens do item arrastado saem da lista enquanto dura o arrasto (vão com ele).
