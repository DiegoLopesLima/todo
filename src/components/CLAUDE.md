# `src/components/` — UI reaproveitável

`ui/` = primitivos (ShadCN/UI + coss.com/ui), com catálogo próprio. Componentes compostos ficam na
raiz desta pasta. Componente específico de uma página mora **ao lado da rota**, em `src/app/`, não
aqui. Subpasta temática (`dashboard/`, `files/`…) ganha seu próprio `CLAUDE.md` ao nascer.

## Regras de UI (o padrão visual do projeto)

1. **Instale antes de criar.** ShadCN (`npx shadcn@latest add <componente>`) ou coss.com/ui
   (`npx shadcn@latest add @coss/<componente>`) primeiro. Escreva à mão só o que não existe em
   nenhuma das duas.
2. **Controle de seleção = `Combobox` do coss, sempre.** Nunca reintroduza um `Select` — a ausência
   de `ui/select.tsx` é proposital. O `Combobox` é pesquisável. Racional:
   [ADR 0002](../../docs/decisions/0002-combobox-replaces-select.md).
3. **`Button` renderizado como não-botão ⇒ `nativeButton={false}`** (e remova `type="button"`),
   senão a Base UI loga erro em runtime.
4. **Botão só com ícone precisa de `Tooltip` *e* `aria-label`** — o tooltip nomeia a ação para quem
   enxerga, o `aria-label` para tecnologia assistiva. O app já é embrulhado em `TooltipProvider`.
5. **Nunca use o atributo nativo `title` para dica de hover — sempre `Tooltip`.**
6. **Só utilitários Tailwind** em componente próprio — nada de arquivo/módulo CSS ou `style` inline.
   `@keyframes` custom moram em `globals.css` e são acionados por classe utilitária.
7. **Ícones só via `@iconify/react`** (`<Icon icon="lucide:home" />`), e o ícone usado tem de estar
   no registro offline (`@/lib/icons`, regra em `src/lib/CLAUDE.md`). Exceção: os primitivos de `ui/`
   mantêm os imports `lucide-react` com que vieram — não reescreva.
8. **O deslocamento da barra de rolagem já é tratado globalmente** (`html { scrollbar-gutter: stable }`
   em `globals.css`). Não recrie `modal={false}` nem reservas locais de gutter para combater isso.
9. **Estado vazio = `EmptyState`**, nunca um bloco "sem dados" à mão.
10. **Casca de página = `PageContainer`**. Nunca reescreva a string `<main className="mx-auto … max-w-*">`.
11. **Caixa aninhada usa raio MENOR que a de fora**: `rounded-xl` (`Card`) → `rounded-lg` →
    `rounded-md`. Repetir o raio do pai faz os cantos parecerem colados.
12. **Menu dropdown se dimensiona pelos ITENS, nunca pelo gatilho** — `DropdownMenuContent` é `w-fit`
    e os itens são `whitespace-nowrap`. Menu em forma de select passa `w-(--anchor-width)` na própria
    `className`. Lista longa de opções vai para um `DropdownMenuSub`.
13. **Elemento que desenha o próprio indicador com `ring`/`ring-offset`/`shadow` nunca pode estar
    dentro de uma caixa com `overflow` diferente de `visible`** — são box-shadow pintados FORA da
    border box e são recortados. Use `outline` com offset negativo ou `inset-ring`; verifique a cadeia
    de ancestrais inteira, não só o elemento.
14. **Toda superfície suporta claro + escuro** pelas CSS variables de `globals.css` — nunca hard-code
    cor.

## Componentes compostos (raiz de `src/components/`)

| Componente · `@/components/<nome>` | Para que serve |
|---|---|
| `ThemeToggle` | Menu de tema (claro/escuro/sistema) sobre `useThemeChoice`. |
| `LocaleSwitcher` | Menu de idioma sobre `useLocaleChoice`; troca o locale mantendo a rota. |
| `ConfirmDialog` | Quadro de "tem certeza?": título, descrição, cancelar e confirmar `destructive` com spinner em `pending`. Só apresentação — a ação, o toast e o refresh são do chamador. |
| `EmptyState` | O único estado vazio: `variant: card \| plain`, `icon?`, `title`, `description?`, `action?`. |
| `PageHeader` | Cabeçalho de página: tile de ícone + `h1` + subtítulo + `action?`. Strings já traduzidas. |
| `PageContainer` | Casca de página (`<main>` centralizado, `fluid?` para o layout largo) com a entrada animada. |
| `ProgressRing` | Anel de progresso animado (`value` 0–1, `complete?`, `children` no centro). Decorativo (`aria-hidden`): quem o usa mostra o mesmo dado em texto. |
| `IconButton` | Botão só com ícone: `icon` (Iconify), `label` (vira `aria-label` **e** tooltip), `side?`, `iconClassName?`, `shortcut?` (teclas mostradas em `Kbd` no tooltip) + as props do `Button`. É o jeito de cumprir a regra 4. |
| `RouteError` | Corpo de todo `error.tsx`: mensagem traduzida, retry e o `digest` do erro. `variant: shell \| page`. |
| `RouteLoading` | Spinner centralizado para `loading.tsx`. |

---
> Componente composto novo? Adicione a linha acima na mesma mudança. Primitivo novo: `ui/CLAUDE.md`.
