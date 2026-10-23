# `src/providers/` — context providers

| Export · import | Assinatura | Para que serve |
|---|---|---|
| `Providers` · `@/providers` | `({ children }) => ReactNode` | Árvore raiz: `ThemeProvider` + `NuqsAdapter` (search params tipados) + `QueryProvider` + `TooltipProvider` + toaster. Já montada em `[locale]/layout.tsx`. |
| `QueryProvider` · `@/providers/QueryProvider` | `({ children }) => ReactNode` | Dá à árvore o `QueryClient` do TanStack (`makeQueryClient`), criado em `useState` por montagem — um cliente de módulo vazaria cache entre usuários no SSR. |
| `ThemeProvider` · `@/providers/ThemeProvider` | `({ children, ...props }) => ReactNode` | Envolve o `next-themes` (claro/escuro). |
| `ServiceWorkerRegistrar` · `@/providers/ServiceWorkerRegistrar` | `() => null` | Registra o service worker quando a página termina de carregar. Montado por `TodoApp`. |
| `TodoProvider` · `@/providers/TodoProvider` | `({ children }) => ReactNode` | Liga o app de tarefas ao navegador: hidrata as stores, gera as ocorrências recorrentes devidas (abrir, virar o dia, foco/rede), acompanha outra aba e faz `flush` ao esconder a aba. Montado por `TodoApp`, não pelo `Providers` raiz. |

## Regras desta pasta

- Como `Providers` já embrulha a aplicação, o `TooltipProvider` é global — nenhum tooltip precisa de
  provider próprio.
- `Providers` importa `@/lib/icons` (efeito colateral) para registrar as coleções Iconify antes de
  qualquer `<Icon>` renderizar.
- Provider que lê `useSearchParams()` precisa de um boundary Suspense, ou a rota inteira vira dinâmica e perde
  cache estático.

---
> Provider novo ou alterado? Atualize esta tabela na mesma mudança.
