# Glossário

As regras de negócio falam a língua do negócio; o código fala a dele. Esta tabela é a ponte — e a
razão de nome de tabela, coluna, endpoint ou chave de tradução **não** entrar num arquivo de regras.

Ao escrever regra, use a coluna da esquerda. Ao ler código, traduza pela direita.

| No negócio | No código | O que é |
|---|---|---|
| Tarefa, item | `Item` | uma linha da lista; pode ter subitens. Na interface diga "tarefa" ou "item", nunca "todo" |
| Subitem | item com `parentId` | filho de outro item; no máximo seis níveis |
| Faixa de prioridade | itens irmãos com a mesma `priority` | o `rank` (posição manual) só compara itens da mesma faixa |
| Aparece em / início | `startsOn` | o item fica oculto em **Hoje** até esta data |
| Prazo | `dueOn` | passado o prazo sem concluir, o item é **atrasado** |
| Repetição | `Series` (série) | a regra + o molde; não é um item |
| Ocorrência | item com `seriesId` e `occurrenceOn` | o item de um dia de uma repetição, gerado de verdade |
| Dispensar atrasadas | `dismissOverdue` | remove as ocorrências abertas e vencidas; não toca em itens comuns |
| Dia zerado | `clearedDays` | **Hoje** sem nada aberto e pelo menos uma conclusão; base da sequência |
| Sequência | `computeStreak` | dias zerados seguidos; "em risco" quando hoje ainda não foi zerado |
| Hoje, Próximos, Todos | `TodoView` | as três visões da lista |
| Mesclar, Substituir | `ImportMode` | como um arquivo importado se combina com a lista atual |
| Histórico | `history` | registro só-acrescenta do que aconteceu; desfazer acrescenta um "desfeito" |
| Cursor | `cursors` | até que dia as ocorrências de uma série já foram geradas; nunca recua |

> Uma palavra entra aqui quando o código a
> chama por outro nome, ou quando a interface proíbe um sinônimo.
