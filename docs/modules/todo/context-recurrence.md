# Tarefas — contexto da recorrência e das datas

Por que as datas e as repetições se comportam como se comportam. Comportamento esperado:
[regras de recorrência](rules-recurrence.md); decisão técnica: [ADR 0007](../../decisions/0007-recurrence-series-and-idempotent-materialization.md).

**Regras de negócio:** [Regras](rules.md)

## Datas são dias do calendário, não instantes

**Por quê:** "toda quarta" é a quarta de onde a pessoa está. Guardar `2026-03-11` em vez de um
instante elimina a classe de erro de horário de verão e de fuso: somar dias e meses é aritmética de
inteiros, igual em qualquer máquina. O que é instante (quando algo foi concluído, o histórico) guarda
o ISO completo — só para auditoria, nunca para decidir o dia de um item.

**Custo aceito:** quem viaja entre fusos vê "hoje" mudar com o relógio local.

## Concluir não gera a próxima na hora

**Por quê:** a próxima ocorrência aparece **no dia previsto** (ao abrir o app, ou à meia-noite com ele
aberto). Gerar na hora da conclusão faria "Code review" de amanhã aparecer hoje, poluindo a lista de
quem acabou de zerar o dia.

**Alternativa descartada — "a cada N dias depois de concluir".** Não há agenda fixa, então não existe
"o de ontem ficou para trás".

## Atrasadas acumulam, com teto

**Por quê:** a decisão de produto é não esconder o que ficou por fazer. O teto (31 por série, 200 por
execução, sempre as mais recentes) existe porque abrir o app depois de meses geraria centenas de
linhas; o excedente é registrado como "puladas" e avisado, e **Dispensar atrasadas** limpa o resto em
um passo desfazível.

## Mudar a regra recomeça no primeiro dia ainda não gerado

**Por quê:** com intervalo maior que 1 ("a cada 2 semanas"), a fase da série depende da âncora.
Mudar a regra e manter a âncora antiga faria a nova cadência cair em dias que a pessoa não esperaria;
recomeçar a contagem do próximo dia não gerado é o que "a partir de agora" significa.

## Mensal no dia 31 e anual em 29/02

**Por quê:** mês curto não pode simplesmente pular — a tarefa de "todo dia 31" cai no último dia do
mês. O mesmo vale para 29 de fevereiro, que cai em 28 nos anos não bissextos. A semana começa no
domingo nos dois idiomas do app.

## Encerrar não é excluir

**Por quê:** encerrar preserva o que a série já gerou e concluiu (o histórico de "em que dias eu fiz");
excluir remove a série e as ocorrências abertas, mantendo as concluídas como registro, a menos que a
pessoa escolha apagá-las também.
