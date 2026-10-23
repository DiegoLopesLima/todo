# Tarefas — contexto e decisões

Por que o módulo é como é. **Não é instrução**: o comportamento esperado está nas
[regras](rules.md); decisões técnicas duradouras, nos [ADRs](../../decisions/README.md).

**Regras de negócio:** [Regras](rules.md)

## Linha inteira alterna; duplo clique não edita

**Por quê:** a promessa do produto é marcar sem mirar no checkbox. Se o duplo clique também editasse,
o primeiro clique já teria alternado o item e o segundo o desfaria — dois eventos no histórico, dois
confetes e a edição aberta sobre um estado trocado.

**Alternativa descartada — atrasar o clique ~250 ms para distinguir o duplo.** Torna toda marcação
lenta para servir a um gesto raro.

## Prioridade manda, posição manual desempata

**Por quê:** os dois pedidos — "tudo ordenado por prioridade" e "reordenar livremente" — só convivem se
a posição manual valer **dentro** da faixa de prioridade. Arrastar para outra faixa muda a prioridade
(o mesmo modelo do Linear), em vez de criar uma ordem que contradiz o selo de prioridade.

**Alternativa descartada — posição manual absoluta, com prioridade só como rótulo.** Perde a
promessa de que o mais importante está sempre em cima.

**Alternativa descartada — reordenar sozinho por prazo.** Itens que mexem sob o cursor tiram a
confiança; a ordenação inteligente virou uma ação explícita e desfazível.

## Recorrência: ocorrências reais, geradas ao alcançar o dia

**Por quê:** o produto pede que cada dia perdido seja uma linha própria. Tratar cada ocorrência como
um item de verdade dá a ela, de graça, subitens, edição, desfazer e histórico — e o histórico passa a
responder "em que dias eu fiz o code review".

**Alternativa descartada — ocorrências virtuais calculadas na tela.** Exigem um mapa de conclusões por
série e não suportam subitens por dia nem editar um dia isolado.

**Alternativa descartada — reiniciar o mesmo item (estilo hábito).** Não há como reordenar nem
detalhar o dia, e perde-se a data de cada conclusão.

**Alternativa descartada — "a cada N dias *depois* de concluir" (`every!` do Todoist).** Não existe
agenda fixa, incompatível com acumular atrasados.

## Datas sem fuso

**Por quê:** início, prazo e dia da ocorrência são **dias do calendário local**, não instantes. Isso
elimina a classe de bug de horário de verão e de viagem: "toda quarta" é a quarta de onde a pessoa
está. O custo aceito: quem viaja entre fusos vê o dia mudar com o relógio local.

## Sequência exige zerar o dia

**Por quê:** foi a escolha do produto — a sequência mede o dia cumprido, não só a presença. O risco
conhecido é um atrasado antigo impedir de zerar o dia para sempre; por isso "Dispensar atrasados"
existe e é desfazível.

## Desfazer na sessão, histórico persistido

**Por quê:** desfazer é uma ferramenta do momento; o histórico é um registro. Persistir a pilha de
desfazer exigiria reconciliar passos antigos com alterações de outras abas. O registro, por sua vez, é
só-acrescenta: desfazer acrescenta um registro compensatório em vez de apagar o original, assim a
pergunta "quando isto foi marcado?" nunca perde a resposta.

## Prioridade pelo texto é `!1`–`!4`

**Por quê:** `p1`…`p4` colidem com texto comum ("revisar p2 do contrato"). O `!` no início ou no fim,
isolado por espaço, quase nunca aparece como texto e o chip de pré-visualização mostra o que foi
entendido.
