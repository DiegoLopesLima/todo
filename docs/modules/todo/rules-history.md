# Tarefas — histórico e desfazer

Voltar: [regras gerais](rules.md).

## Desfazer e refazer

**Regra:** Ctrl/Cmd+Z desfaz a última alteração e Ctrl/Cmd+Shift+Z (ou Ctrl+Y fora do macOS) refaz.
Vale para **qualquer** alteração feita pela pessoa — marcar, criar, editar, excluir, mover, reordenar,
dispensar, importar — uma de cada vez, na ordem inversa. Há também botões de desfazer/refazer e, depois
de ações destrutivas ou em lote, um aviso com "Desfazer". Guardam-se até cem passos.

**Regra:** Os atalhos não agem enquanto a pessoa digita num campo (que tem o desfazer próprio do texto),
durante a composição de um caractere (IME) ou com um diálogo aberto.

**Regra:** Uma alteração é um passo só, mesmo que mexa em vários itens: marcar um pai que conclui
cinco filhos é desfeito de uma vez. Editar texto vale um passo ao confirmar, não por tecla.

**Regra:** A geração automática de ocorrências **não** entra na pilha de desfazer (a pessoa não
"desfaz" a passagem do tempo). A pilha vive só na sessão: recarregar a página ou receber uma alteração
de outra aba a esvazia.

**Cenário:** desfazer uma conclusão acidental
- **Dado** que a pessoa marcou um pai com cinco filhos por engano
- **Quando** aperta Ctrl+Z
- **Então** o pai e os cinco filhos voltam a abertos, e Ctrl+Shift+Z os conclui de novo

## Histórico de alterações

**Regra:** O app registra, com data e hora, cada alteração: item criado, editado (com o que mudou,
antes e depois), concluído, reaberto, movido, reordenado, excluído, importado; ocorrência gerada, puladas
ou dispensadas; série criada, alterada ou encerrada; desfazer e refazer. Cada registro diz se foi a
pessoa ou o sistema. O texto do item é guardado no registro, então ele continua legível mesmo depois de
o item ser excluído.

**Regra:** Uma ação que muda vários itens (concluir um pai com cinco filhos) é um passo só para
desfazer, mas registra um evento **por item que mudou** — assim o histórico responde "quando este
filho foi concluído". O menu da linha abre o histórico só daquele item.

**Regra:** O histórico só cresce: a interface não permite editar nem apagar um registro. Desfazer
**não** apaga o registro original — acrescenta um registro "desfeito" e o original passa a aparecer
marcado como desfeito. Reordenações seguidas do mesmo item em até dois segundos viram um só registro.

**Regra:** O histórico guarda no máximo dois mil registros e nenhum com mais de cento e oitenta dias;
os mais antigos são removidos automaticamente — única forma de um registro sumir.

**Cenário:** consultar quando algo foi feito
- **Dado** um item concluído, reaberto e concluído de novo
- **Quando** a pessoa abre o histórico e filtra por esse item
- **Então** vê os três registros em ordem, cada um com data e hora

**Regra:** O histórico pode ser filtrado por tipo de evento, por item, por período e por origem
(pessoa ou sistema).
