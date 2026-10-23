# Tarefas — ordem, prioridade e movimento

Voltar: [regras gerais](rules.md).

## Ordem dos itens

**Regra:** Os irmãos de qualquer nível ficam ordenados por: abertos antes de concluídos, depois
prioridade (`p1` primeiro), depois a posição manual dentro da faixa de prioridade. A posição manual só
compara itens da **mesma** prioridade.

**Cenário:** item novo
- **Dado** itens `p1`, `p2` e `p2` num nível
- **Quando** a pessoa cria um item `p2`
- **Então** ele fica depois dos outros `p2` e antes de qualquer `p3`

**Cenário:** mudar a prioridade
- **Dado** um item `p4` no fim da lista
- **Quando** a pessoa muda sua prioridade para `p1`
- **Então** ele passa para o fim da faixa `p1`, acima de tudo que for `p2` ou menos

**Regra:** Existe uma ação explícita **Ordenar por prazo** num nível: dentro de cada faixa de
prioridade, itens com prazo mais cedo vêm primeiro, seguidos dos sem prazo; é desfazível. O app
**nunca** reordena sozinho depois que a pessoa mexeu.

## Arrastar e soltar

**Regra:** Qualquer item — em qualquer nível — pode ser arrastado pela alça para uma nova posição,
**para dentro** de outro item (virando filho) ou **para fora** (subindo um nível), levando seus
descendentes. A posição horizontal do ponteiro decide o nível de destino; uma linha indicadora mostra
onde o item vai cair e com que prioridade.

**Regra:** Soltar **entre** dois itens de prioridades diferentes faz o item adotar a prioridade do
vizinho para o qual o ponteiro está mais perto; entre dois da mesma prioridade, adota essa. A pessoa
é avisada da mudança de prioridade.

**Cenário:** soltar na fronteira de faixas
- **Dado** um item `p4` e, em outro ponto, a fronteira entre um `p1` (acima) e um `p2` (abaixo)
- **Quando** a pessoa solta o item perto do `p1`
- **Então** ele vira `p1` e fica no fim da faixa `p1`

**Cenário:** indentar sem mudar de faixa
- **Dado** um item `p2` entre um `p2` (acima) e um `p4` (abaixo)
- **Quando** a pessoa só o arrasta para a direita, sem subir nem descer
- **Então** a prioridade continua `p2` — só cruzar para outra faixa muda a prioridade

**Cenário:** destino inválido
- **Dado** um item arrastado
- **Quando** o destino seria dentro dele mesmo, ou de um descendente, ou ultrapassaria seis níveis
- **Então** o movimento é recusado e nada muda

**Regra:** Itens concluídos não são arrastáveis, e durante uma busca ativa arrastar fica desligado.
Em tela de toque, o arrasto só começa pela alça, para o gesto de rolar a lista nunca ser tomado.

## Teclado e alternativas ao arrasto

**Regra:** Tudo o que o arrasto faz tem equivalente sem arrastar: Alt+↑/↓ sobe e desce o item,
Alt+→/← o indenta e desindenta, "Mover para…" escolhe o novo pai numa lista pesquisável, e dentro da
edição inline Tab/Shift+Tab indentam e desindentam. Mover cruzando a fronteira de uma faixa muda a
prioridade, com aviso sonoro para leitor de tela.

**Regra:** A lista é uma única parada de Tab; as setas ou `j`/`k` percorrem as linhas, `→`/`←`
expandem e recolhem, Espaço alterna, Enter/F2 edita, `1`–`4` definem a prioridade, Delete exclui e `?`
lista os atalhos. Atalhos de uma tecla ficam desativados enquanto a pessoa digita num campo.
