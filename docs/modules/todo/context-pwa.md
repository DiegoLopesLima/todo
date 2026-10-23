# Tarefas — contexto do uso offline e da instalação

Comportamento esperado: [dados e offline](rules-data.md); decisão técnica:
[ADR 0008](../../decisions/0008-service-worker-written-by-hand.md).

**Regras de negócio:** [Regras](rules.md)

## O HTML é "rede primeiro"; os arquivos com hash são "cache primeiro"

**Por quê:** com a rede disponível, a pessoa sempre recebe a versão mais nova do app. Os arquivos de
`/_next/static/` têm o hash do conteúdo no nome, então nunca mudam: guardá-los para sempre é seguro, e
**não versioná-los** deixa uma aba aberta antes de um deploy continuar achando os próprios arquivos.

## A raiz não é guardada; o idioma final é

**Por quê:** `/` redireciona para `/pt-BR` ou `/en`. O navegador **recusa** servir de volta, numa
navegação, uma resposta que passou por redirecionamento — então o worker guarda uma cópia nova do HTML
sob o endereço final e, offline, abre o último idioma visitado.

## Os ícones PNG moram em `/api/pwa-icon`

**Por quê:** o `proxy.ts` do next-intl redireciona qualquer caminho sem extensão para o prefixo de
idioma. Um ícone em `/icon/192` viraria `/pt-BR/icon/192` e daria 404. Caminhos com ponto (`/sw.js`,
`/manifest.webmanifest`, `/icon.svg`) e `/api/*` já escapam do proxy.

## Limitações conhecidas

- Trocar de idioma **sem rede** recarrega a página inteira (a troca é uma requisição RSC, que o worker
  deixa passar).
- O manifesto é único: o nome do app instalado e a descrição vêm dele, em português.
- ⚠️ não verificado: instalação, uso offline, atualização do worker e a troca de idioma sem rede
  dependem de conferência manual num navegador real, com `next build` e `next start`.
