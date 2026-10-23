# Arquitetura do sistema

As decisões estruturais que valem para o app inteiro e que nenhum módulo pode contrariar sozinho.
Onde os arquivos ficam e como importá-los está nos `CLAUDE.md`; aqui está a forma do sistema.

## O produto

Um app de **tarefas em lista hierárquica** para uso diário, **sem conta e sem servidor**: os dados
vivem no navegador (IndexedDB) e o app abre e funciona sem internet. Prioridade, repetição, datas,
arrastar e soltar, desfazer, histórico e exportação/importação em JSON. O que ele **não** é: não
sincroniza entre dispositivos, não tem colaboração nem notificações.

Regras de negócio: [tarefas](modules/todo/rules.md). A decisão que molda tudo:
[ADR 0005](decisions/0005-local-first-indexeddb-persistence.md).

## Camadas: onde cada tipo de código mora

| Camada | Responsabilidade | Fronteira dura |
|---|---|---|
| Rotas e componentes (`src/app/`, `src/components/`) | renderizar e coletar entrada | **nunca** tocam banco, cache ou terceiro |
| Server Actions e Route Handlers | autorizar, validar e orquestrar | chamam serviços, não o banco |
| Serviços (`src/services/`) | **todo** o acesso a dados | helpers de autorização primeiro, escopo no `where` |
| `src/lib/` | singletons, `env` validado, regras puras | sem estado de requisição |
| `src/constants/`, `src/enums/` | valores nomeados e tuplas compartilhadas | sem literal semântico solto no resto do código |

Neste app o "dado" é local: o acesso ao IndexedDB mora em `src/services/` (serviços client-only) e o
domínio puro do módulo em `src/lib/todo/` (exceções do
[ADR 0005](decisions/0005-local-first-indexeddb-persistence.md)). Fora isso, o navegador só chega aos
dados por `@/lib/axios` contra `/api`. Mutação, na prática, é **Server
Action** — as rotas de API existem para o que precisa de HTTP de verdade (upload, webhook, health
check) e para leituras cacheadas por `useQuery`
([ADR 0003](decisions/0003-reads-via-route-handlers-and-tanstack-query.md)).

## Internacionalização

Todo texto visível é traduzido em `pt-BR` **e** `en`, com a mesma estrutura de chaves em
`messages/*.json`. O locale mora na URL (`/pt-BR/...`, `/en/...`) e é resolvido pelo `src/proxy.ts`.
Notificações e e-mails guardam a **chave** + parâmetros, nunca o texto renderizado. Detalhes e a
checklist de um locale novo: [`src/i18n/CLAUDE.md`](../src/i18n/CLAUDE.md).

## Tema

Toda superfície suporta claro e escuro por CSS variables em `src/app/globals.css`; nenhum componente
hard-coda cor. A marca é a família `--primary-*` (+ `THEME_COLOR` em `src/constants/app.ts`).

## Validação nas bordas

Zod em tudo que cruza uma fronteira: formulário, payload de API, `env`, parsing em runtime. O mesmo
schema valida no cliente (UX) **e** no servidor (segurança) — o servidor sempre reparseia.

## O que é público e o que não é

Hoje o app inteiro é público e **não há superfície sem sessão a proteger**: não existe conta, servidor
de dados nem endpoint que leia ou escreva dados da pessoa (`/api/health` e os ícones não tocam nelas).
Os dados nunca saem do navegador, exceto quando a pessoa **exporta** um arquivo. Quando entrar autenticação, toda página privada vive sob `/dashboard`
(`PROTECTED_ROUTES`) e a regra de acesso é **uma função pura e testada**, nunca uma teia de
condicionais espalhada — ver a [receita de autenticação](recipes/auth.md).

A entrada de dados não confiável é o **arquivo de importação**: validado por Zod (formato, versão,
tamanho, ids sem `__proto__`, datas reais) e reparado antes de entrar — ver
[dados e offline](modules/todo/rules-data.md).

## Integrações externas

Nenhuma. O app não chama serviço de terceiro (as fontes e os ícones são empacotados; o confete é uma
biblioteca local carregada sob demanda). Se uma integração entrar, documente aqui o que quebra sem ela e
se falha aberto ou fechado. Receitas prontas: [integrações](recipes/integrations.md).
