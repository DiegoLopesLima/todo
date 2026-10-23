# Tarefas — datas e recorrência

Voltar: [regras gerais](rules.md).

## Datas de um item

**Regra:** Um item pode ter uma data de **início** ("aparece em") e/ou um **prazo**. Antes do início o
item fica oculto em **Hoje** e aparece em **Próximos**. Passado o prazo sem concluir, o item aparece
como **atrasado**, em destaque. O início nunca pode ser depois do prazo. As datas são dias do
calendário local, sem horário nem fuso.

**Cenário:** tarefa de um dia só
- **Dado** um item com início e prazo em uma quarta-feira
- **Quando** a pessoa olha **Hoje** na terça
- **Então** ele não aparece; na quarta aparece; na quinta, sem ter sido concluído, aparece atrasado

## Itens recorrentes

**Regra:** Dá para criar uma tarefa já com repetição pelo botão "quando e repetição" do campo de
criação; numa tarefa que se repete não há prazo, porque cada ocorrência vence no próprio dia.

**Regra:** Uma recorrência pode ser diária, semanal (em dias da semana escolhidos), mensal (num dia do
mês ou no último dia) ou anual, sempre com um intervalo ("a cada 2 semanas"), e opcionalmente com um
fim. Cada dia previsto gera uma **ocorrência**: um item de verdade, com a data do dia, que pode ser
concluído, editado, ter subitens e ser reordenado. Concluir a de hoje **não** gera a de amanhã na hora:
a próxima só aparece no dia previsto.

**Cenário:** "Code review" todos os dias
- **Dado** uma série diária criada hoje
- **Quando** a pessoa conclui a ocorrência de hoje
- **Então** amanhã, ao abrir o app (ou à meia-noite, com o app aberto), uma nova ocorrência "Code review"
  aparece aberta

**Cenário:** "Atualizar branch" toda quarta-feira
- **Dado** uma série semanal às quartas
- **Quando** chega uma nova quarta-feira
- **Então** aparece uma ocorrência aberta com a data daquela quarta; nos outros dias não aparece nada

**Cenário:** mensal no dia 31
- **Dado** uma série mensal no dia 31
- **Quando** o mês tem trinta dias, ou é fevereiro
- **Então** a ocorrência cai no último dia desse mês

**Cenário:** anual em 29 de fevereiro
- **Dado** uma série anual iniciada em 29 de fevereiro
- **Quando** o ano não é bissexto
- **Então** a ocorrência cai em 28 de fevereiro

## Atrasadas acumulam

**Regra:** Ocorrências não concluídas **não** somem: elas ficam na lista, cada uma como uma linha com
a **sua data visível**, e a de hoje aparece junto. Se o app ficou fechado por dias, ao abrir ele gera
as ocorrências de todos os dias que faltam — no máximo trinta e uma por série e duzentas no total por
vez. O que passar disso não vira linha: o app registra no histórico que ocorrências foram puladas e
mostra um aviso.

**Cenário:** voltar de férias
- **Dado** uma série diária e o app fechado por quatro dias
- **Quando** a pessoa abre o app
- **Então** aparecem quatro ocorrências atrasadas (uma por dia perdido) e a de hoje, todas abertas

**Cenário:** ficar fechado por meses
- **Dado** uma série diária e o app fechado por cem dias
- **Quando** a pessoa abre o app
- **Então** só as trinta e uma mais recentes viram linhas e um aviso explica que as demais foram puladas

**Regra:** **Dispensar atrasados** conclui o assunto sem fazer: remove as ocorrências abertas e
vencidas (todas, ou as mais antigas que N dias), registra no histórico e é desfazível em um passo.
Gerar ocorrências duas vezes no mesmo dia, ou em duas abas, nunca duplica nada.

## Editar uma série

**Regra:** Ao editar uma ocorrência a pessoa escolhe o alcance: **só esta**, ou **esta e as futuras**.
Mudar a regra de recorrência vale só para as datas futuras; ocorrências já geradas continuam como
estão. A estrutura de subitens de uma ocorrência pode ser aplicada às próximas ("aplicar às próximas").
Cada ocorrência nasce com uma cópia dos subitens da série, todos abertos.

**Regra:** **Encerrar** uma série define o fim como ontem: nada novo é gerado, as ocorrências
concluídas permanecem. **Excluir** uma série apaga a série e as ocorrências **abertas**; as concluídas
ficam como registro, sem vínculo com a série — a menos que a pessoa marque a opção de apagar também as
concluídas. O diálogo informa quantas ocorrências serão afetadas.

**Cenário:** excluir uma série mantendo o histórico
- **Dado** uma série com três ocorrências concluídas e duas abertas
- **Quando** a pessoa a exclui sem marcar "apagar também as concluídas"
- **Então** as duas abertas somem e as três concluídas continuam na lista como itens comuns

**Regra:** Em **Próximos** aparece, para cada série, a próxima data prevista (uma prévia, que não é um
item e não pode ser concluída ali).
