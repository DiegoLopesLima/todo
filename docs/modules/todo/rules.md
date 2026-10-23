# Tarefas — regras de negócio

> Formato BDD: descreve o **comportamento esperado**. Outros assuntos: [ordem e prioridade](rules-order.md),
> [recorrência e datas](rules-recurrence.md), [histórico e desfazer](rules-history.md),
> [dados, backup e uso offline](rules-data.md). Racional: [contexto](context.md).

## Criar um item

**Regra:** Criar um item exige só um texto. Prioridade e pai são opcionais; sem prioridade o item é
`p4` (a mais baixa) e entra **no fim** da sua faixa de prioridade. O texto tem no máximo quinhentos
caracteres e não pode ser vazio depois de aparado. O aninhamento vai até seis níveis.

**Cenário:** criar só com texto
- **Dado** uma lista com dois itens `p4`
- **Quando** a pessoa digita "Pagar boleto" e confirma
- **Então** o item aparece depois dos dois, ainda `p4`, sem pai
- **E** o campo de texto fica pronto para o próximo (e o "dentro de…" escolhido continua, para criar vários subitens em sequência)

**Cenário:** prioridade pelo menu
- **Dado** o campo de criação, que mostra a prioridade **Normal** já escolhida
- **Quando** a pessoa abre o menu de prioridade e escolhe **Alta** (ou aperta Alt+2) e cria a tarefa
- **Então** a tarefa nasce `p2`, o foco volta ao campo de texto e a prioridade volta para **Normal** na próxima

**Cenário:** criar já com data ou repetição
- **Dado** o campo de criação com texto digitado
- **Quando** a pessoa abre "quando e repetição", escolhe um prazo (ou uma repetição) no calendário e aplica
- **Então** nada é criado ainda e o texto digitado fica intacto; o botão mostra o resumo ("Prazo amanhã", "Todo dia")
- **E** ao confirmar com Enter a tarefa nasce com essa data (ou como uma tarefa que se repete) e o agendamento é limpo para a próxima

**Cenário:** prioridade pelo texto
- **Dado** que a pessoa digita "!2 Revisar contrato"
- **Quando** confirma
- **Então** o item é criado como `p2` com o texto "Revisar contrato"
- **E** o seletor de prioridade passa a mostrar `p2`; escolher outra no seletor troca o marcador do texto
- **E** um `!2` no meio do texto ("revisar !2 do contrato") **não** é interpretado

**Cenário:** texto vazio ou profundo demais
- **Dado** um texto só com espaços, ou um pai que já está no sexto nível
- **Quando** a pessoa tenta criar
- **Então** nada é criado e ela vê o motivo

## Concluir e reabrir

**Regra:** Clicar em qualquer ponto da linha do item marca ou desmarca — o checkbox não é o único alvo.
Chevron, alça de arrastar, lápis e menu **não** alternam o item. Selecionar texto com o mouse não
alterna.

**Regra:** Um pai com filhos só está concluído quando **todos** os filhos estão. Marcar um pai marca
todos os descendentes; desmarcar um pai desmarca todos. Marcar o último filho aberto conclui o pai;
desmarcar qualquer filho reabre o pai. Um pai com parte dos filhos concluídos aparece no estado
**indeterminado**.

**Cenário:** pai parcialmente concluído
- **Dado** um pai com três filhos abertos
- **Quando** a pessoa marca um dos filhos
- **Então** o pai fica indeterminado e mostra "1/3"

**Cenário:** concluir o último filho
- **Dado** um pai com dois filhos, um deles já concluído
- **Quando** a pessoa marca o outro
- **Então** o pai fica concluído, com celebração de "pai concluído"

**Cenário:** reabrir um pai
- **Dado** um pai concluído com dois filhos concluídos
- **Quando** a pessoa desmarca o pai
- **Então** o pai e os dois filhos voltam a abertos

**Cenário:** novo filho num pai concluído
- **Dado** um pai concluído
- **Quando** a pessoa cria ou move para ele um filho aberto
- **Então** o pai volta a aberto

**Cenário:** excluir o último filho aberto
- **Dado** um pai com um filho aberto e um concluído
- **Quando** a pessoa exclui o filho aberto
- **Então** o pai passa a concluído

**Regra:** Um item concluído continua na lista, riscado e esmaecido; depois de uma breve pausa
(seiscentos milissegundos) ele desce para o fim do seu grupo de irmãos, e voltar a abri-lo o devolve
à posição que tinha.

## Visões

**Regra:** A lista tem três visões e uma busca. **Hoje** mostra o que está ativo hoje (sem data de
início, ou com início até hoje), os atrasados e o que foi concluído hoje. **Próximos** mostra o que
começa depois de hoje e a próxima data de cada série recorrente. **Todos** mostra tudo. Um pai aparece
sempre que algum descendente aparece; quando só um descendente casa com a busca, o pai é mostrado
esmaecido, como contexto.

**Cenário:** item agendado
- **Dado** um item que só aparece a partir de amanhã
- **Quando** a pessoa olha **Hoje**
- **Então** o item não aparece; ele está em **Próximos** e em **Todos**

**Cenário:** concluído de dias atrás
- **Dado** um item concluído anteontem e sem filhos abertos
- **Quando** a pessoa olha **Hoje**
- **Então** ele não aparece; em **Todos** ele continua lá

## Editar e excluir

**Regra:** Tudo pode ser editado a qualquer momento: texto, prioridade, pai, datas e recorrência. O
texto é editado pelo lápis, por F2/Enter na linha ou pelo menu — **duplo clique não edita**. Excluir
um item exclui seus descendentes; a exclusão é desfazível e a pessoa não precisa confirmar.

**Cenário:** excluir um pai
- **Dado** um pai com dois filhos
- **Quando** a pessoa o exclui
- **Então** o pai e os filhos somem, e um aviso oferece desfazer

## Progresso, sequência e celebração

**Regra:** O anel do cabeçalho mostra "X de Y hoje" contando as folhas — itens sem filhos — da
visão **Hoje** (incluindo atrasados e itens sem data) mais as concluídas hoje. Cada pai mostra "X/Y"
e uma barra com o progresso dos seus descendentes.

**Regra:** Um dia está **zerado** quando a visão **Hoje** não tem nenhum item aberto e pelo menos um
item foi concluído naquele dia. A **sequência** conta os dias zerados seguidos até hoje. Ela fica
**em risco** quando hoje ainda não foi zerado mas ontem foi; um dia sem nenhuma conclusão a quebra.
Desfazer uma conclusão que zerava o dia o "desfaz" também. Um atrasado antigo impede de zerar o dia —
dispensar os atrasados é a saída.

**Cenário:** zerar o dia
- **Dado** que restava um único item aberto em **Hoje**
- **Quando** a pessoa o conclui
- **Então** o dia conta como zerado, a sequência aumenta e há uma celebração (uma vez por dia)

**Regra:** Quando o sistema operacional pede menos movimento, a celebração com confete não acontece e
as animações são reduzidas.

## Limites

**Regra:** A lista comporta até cinco mil itens. A partir de dois mil, o app avisa que está grande.
Passando do teto, criar e importar são recusados com uma explicação.
