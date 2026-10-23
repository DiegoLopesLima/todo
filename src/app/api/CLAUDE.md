# `src/app/api/` — Route Handlers (a API HTTP)

Únicos endpoints HTTP do app. Mutação, na prática, é **Server Action**; abra um Route Handler quando
precisar de uma URL de verdade (upload, webhook de terceiro, token de tempo real, health check) **ou
para uma leitura do navegador** cacheada por `useQuery` — Server Action como leitura é enfileirada
atrás das escritas ([ADR 0003](../../../docs/decisions/0003-reads-via-route-handlers-and-tanstack-query.md)).
Handler fica fino: banco, cache e terceiros só por `src/services/`.

## Modelo comum

- **Erros:** JSON `{ error: '<código>' }`. Falha de auth devolve corpo vazio + o status.
- **Toda rota declara `maxDuration`** — upstream travado não pode faturar até o teto da plataforma.
- **Rota por usuário** declara `dynamic = 'force-dynamic'` (nunca cacheada).
- **Entrada sempre reparseada com Zod** (query, corpo, params), mesmo que o cliente já valide.
- **Chamador no navegador** usa `@/lib/axios`, nunca `fetch` cru.

## Rotas

| Rota | Para que serve |
|---|---|
| `GET /api/health` | Liveness probe: `200 { status: 'ok' }`. Não toca em banco nem em terceiros. |
| `GET /api/pwa-icon/<192\|512\|maskable>` | Ícone PNG do app, desenhado no build (`ImageResponse`) e estático. Tamanho inválido: `404 { error: 'invalid_size' }`. Mora em `/api` para escapar do `proxy.ts` do next-intl ([ADR 0008](../../../docs/decisions/0008-service-worker-written-by-hand.md)). |

---
> Rota nova? Adicione a linha (método, caminho, contrato) na mesma mudança.
