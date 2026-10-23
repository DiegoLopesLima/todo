# Tarefas — dados, backup e uso offline

Voltar: [regras gerais](rules.md).

## Onde os dados ficam

**Regra:** Tudo fica no navegador da pessoa — não há conta nem servidor. As alterações são gravadas
logo depois de feitas (em até dois segundos) e também ao sair ou esconder a aba. Se o navegador não
conseguir gravar, o app continua funcionando em memória e mostra um aviso claro de que os dados **não**
estão sendo salvos, com um atalho para exportar.

**Regra:** Duas abas abertas ao mesmo tempo ficam em sincronia: uma alteração numa aparece na outra, e
uma aba nunca sobrescreve uma gravação mais nova feita pela outra. Quando isso acontece a pessoa é
avisada.

**Regra:** Se os dados salvos estiverem corrompidos, o app abre vazio **sem** apagá-los: guarda uma cópia
do conteúdo cru e oferece exportá-la.

## Exportar e importar

**Regra:** A pessoa pode **exportar** tudo (itens, séries e histórico) para um arquivo JSON com versão
do formato. Para **importar** ela escolhe o arquivo, vê um resumo do que ele contém e escolhe entre
**mesclar** e **substituir** antes de confirmar.

**Regra:** **Mesclar** acrescenta o que não existe e, para um item que existe nos dois lados, mantém a
versão alterada mais recentemente. **Substituir** troca tudo pelo conteúdo do arquivo. Nos dois casos a
importação é desfazível em um passo, e o conteúdo atual é preservado nesse passo.

**Cenário:** arquivo inválido
- **Dado** um arquivo que não é JSON, que não é deste app, que passa de dez megabytes ou que tem dados
  malformados (por exemplo, uma data como 31 de fevereiro)
- **Quando** a pessoa tenta importá-lo
- **Então** nada muda e ela vê uma mensagem dizendo o que está errado e onde

**Cenário:** importar além do limite
- **Dado** uma lista com 4.900 itens e um arquivo com 300
- **Quando** a pessoa tenta mesclar
- **Então** a importação é recusada com a explicação do limite de cinco mil itens

**Regra:** O app pede ao navegador armazenamento persistente (que dificulta a remoção automática).
Depois de vinte alterações sem exportar e quatorze dias desde a última exportação — ou nunca tendo
exportado — um lembrete de backup é mostrado.

**Regra:** O menu do cabeçalho tem **Dispensar atrasadas** e **Limpar concluídas antigas** (as de
primeiro nível concluídas há mais de uma semana, com os subitens). As duas são desfazíveis; nenhuma
apaga itens comuns atrasados ou ainda abertos.

## Uso offline

**Regra:** O app pode ser instalado (celular e computador) e abre **sem internet** depois da primeira
visita, com todos os dados. Uma nova versão do app só passa a valer ao recarregar; os dados nunca
dependem da rede. Um indicador discreto mostra quando não há conexão.

**Regra:** O idioma da interface (português ou inglês) vale também offline, com uma limitação
conhecida: trocar de idioma sem internet recarrega a página inteira, e o nome do app instalado segue o
manifesto, que é único.

⚠️ não verificado: a instalação, o uso offline e a troca de idioma sem rede dependem de conferência
manual em navegador real (build de produção).
