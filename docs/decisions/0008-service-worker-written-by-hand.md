# 0008 — PWA com service worker escrito à mão, em `public/sw.js`

**Status:** vigente · revisar quando uma biblioteca de PWA tiver suporte verificado ao Turbopack do Next 16

## Contexto

O app tem de abrir sem internet depois da primeira visita e poder ser instalado. As páginas são
estáticas por idioma (`/pt-BR`, `/en`) e os arquivos do build têm nome com hash.

## Decisão

- Um `sw.js` de ~150 linhas em `public/`, **sem etapa de build**, servido com
  `Cache-Control: no-cache, no-store, must-revalidate` (entrada própria em `next.config.ts`).
- **HTML:** rede primeiro, com tempo limite de 4 s; offline serve o último HTML do mesmo caminho (a
  query `?v=&q=` é ignorada) ou o do último idioma visitado. A cópia guardada é uma `Response` nova —
  uma resposta que passou por redirecionamento (`/` → `/pt-BR`) é recusada pelo navegador numa navegação.
- **`/_next/static/*`:** cache primeiro, para sempre (nome com hash = imutável), com poda por
  quantidade e **sem versão** — um deploy novo não invalida o HTML antigo de uma aba aberta.
- Requisições do roteador do Next (RSC), `/api` e outras origens passam direto.
- O manifesto é `src/app/manifest.ts`; os ícones PNG saem de `/api/pwa-icon/<tamanho>` (as rotas
  precisam de caminho que o `proxy.ts` do next-intl não reescreva — por isso em `/api`).
- Registro só em produção, `updateViaCache: 'none'`.

## Alternativas descartadas

- **`serwist`/`workbox`/`next-pwa`.** Dependem de uma etapa de build que não foi verificada contra o
  Turbopack; `next-pwa` está abandonado. O worker é pequeno e testável em isolamento.
- **Um service worker que faz cache do RSC.** Complexidade e risco de servir navegação inconsistente.

## Consequências

- Trocar de idioma **sem rede** exige recarregar a página inteira (a troca usa uma requisição RSC, que
  passa direto) e o nome do app instalado segue o manifesto único, em português.
- Suba `VERSION` em `sw.js` só quando a **lógica** do worker mudar.
- O comportamento real (instalação, offline, atualização) só se confere em navegador, com
  `next build && next start`.
