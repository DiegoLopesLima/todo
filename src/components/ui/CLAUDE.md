# `src/components/ui/` — primitivos (ShadCN/UI + coss.com/ui)

Componentes de base instalados das bibliotecas, com ajustes locais mínimos. **Não escreva primitivo
à mão**: instale de ShadCN ou coss primeiro (regra 1 em `../CLAUDE.md`). Estes arquivos mantêm os
imports `lucide-react` originais — não os converta para Iconify.

Import sempre por caminho direto: `@/components/ui/<arquivo>`. A configuração do registro está em
`components.json` (estilo `base-nova`, registry `@coss`).

## Catálogo

| Primitivo · arquivo | Partes / props-chave |
|---|---|
| `Button` · `button` | `variant: default \| outline \| secondary \| ghost \| destructive \| link`; `size: default \| xs \| sm \| lg \| icon \| icon-xs \| icon-sm \| icon-lg`; `render?`; `nativeButton?` |
| `Combobox` · `combobox` | `multiple?`, `open`/`onOpenChange`; partes: `ComboboxInput`, `ComboboxChipsInput`, `ComboboxChip(s)`, `ComboboxList`, `ComboboxItem`, `ComboboxPopup`, `ComboboxTrigger`, `ComboboxEmpty`, `ComboboxGroup(Label)`, `ComboboxClear`, `useComboboxFilter` |
| `Dialog` · `dialog` | `DialogTrigger`, `DialogContent` (`showCloseButton?`), `DialogHeader/Title/Description/Footer/Close`. **No celular (`<sm`) o `DialogContent` é tela cheia** (sobe de baixo; corpo rola, rodapé grudado na base, fechar fixo) |
| `AlertDialog` · `alert-dialog` | Confirmação bloqueante, mesmas partes do `Dialog` |
| `Card` · `card` | `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `Tooltip` · `tooltip` | `TooltipTrigger`, `TooltipContent`, `side?`, `align?`; `TooltipProvider` já é global |
| `DropdownMenu` · `dropdown-menu` | Item/Separator/Label/Sub/CheckboxItem/RadioGroup. Largura pelos itens (regra 12) |
| `Tabs` · `tabs` | `TabsList` (`tabsListVariants`; a pílula da aba ativa é um indicador único que desliza), `TabsTrigger`, `TabsContent` |
| `Input`, `Textarea`, `Label`, `Checkbox`, `Switch` | controles nativos estilizados |
| `InputGroup` · `input-group` | `InputGroupAddon`, `InputGroupInput`, `align?` |
| `Badge` · `badge` | `variant?: default \| secondary \| destructive \| outline \| ghost \| link` |
| `ScrollArea` · `scroll-area` | `ScrollBar`; `viewportRef?`. Teto de altura: `max-h-*` **na raiz** (o viewport o herda via `max-h-[inherit]`) |
| `Empty` · `empty` | `EmptyHeader/Media/Title/Description/Content`. **Não use direto** — use `EmptyState` (regra 9) |
| `Popover` · `popover` | `PopoverTrigger`, `PopoverPopup` (= `PopoverContent`; `side`, `align`, `sideOffset`), `PopoverTitle`, `PopoverDescription`, `PopoverClose` |
| `Sheet` · `sheet` | Painel lateral/inferior: `SheetTrigger`, `SheetPopup` (`side: right \| left \| top \| bottom`, `variant: default \| inset`, `fullscreenOnMobile` (com `side="bottom"`: tela cheia no celular), `closeProps` — o `aria-label` do fechar vem em inglês, passe o traduzido), `SheetHeader/Title/Description/Panel/Footer/Close` |
| `ToggleGroup` · `toggle-group` | Conjunto de 2–7 opções (`multiple?`, `value`/`onValueChange`, `variant`, `size`): `ToggleGroupItem`. Use no lugar de uma fila de `Button` com estado. |
| `Toggle` · `toggle` | Botão liga/desliga (`pressed`, `onPressedChange`, `variant`) |
| `Calendar` · `calendar` | Seletor de dia sobre `@daypicker/react` (`mode`, `selected`, `onSelect`, `locale`…) |
| `Progress` · `progress` | `ProgressTrack`/`ProgressIndicator`/`ProgressLabel`/`ProgressValue`; `value` 0–100 |
| `Kbd` · `kbd` | `Kbd`, `KbdGroup` — teclas de atalho |
| `Separator`, `Skeleton`, `Spinner` | partes padrão |
| `Toaster` · `sonner` | `toast()` / `toast.success` / `toast.error` |

## Armadilhas conhecidas

- **Todo modal é tela cheia no celular — largura E altura** (`Dialog`, `AlertDialog`, `Sheet` com `fullscreenOnMobile`): conteúdo no alto, botões no rodapé grudado na base. Modal novo segue o mesmo molde; nunca deixe um "cartão" centralizado no `<sm`.
- **`DialogContent`/`AlertDialogContent` embrulham os filhos num `data-slot="…-body"`** (é ele que rola no celular). Um filho que precise ocupar a altura (formulário) usa `max-sm:flex-1`; o `…Footer` direto no corpo já vai para a base. Modal sem ação própria ganha um rodapé "Fechar" `sm:hidden`.
- **Foco ao abrir:** o Base UI já foca o primeiro campo (mouse/teclado) e, no TOQUE, o próprio modal — para não abrir o teclado sem querer. Só force o campo (`initialFocus`) onde digitar é o propósito (ex.: "Mover para…"). **Foco ao fechar:** `finalFocus` devolve ao lugar de onde a pessoa veio (a linha, o campo de criação); o padrão cai no `<body>` quando o gatilho já não existe.
- **Abas têm um só visual: `<TabsList>` padrão (segmentado), sem `variant`.** A variante `line` existe
  no primitivo, mas mudar o visual das abas é decisão global, não de uma tela. Antes de usar qualquer
  primitivo, `grep` os usos existentes e copie a forma.
- **Navegação real entre rotas que deve parecer abas ainda é `Tabs`**, nunca um estilo novo: componha
  `TabsTrigger` com `render` + `nativeButton={false}` sobre um `Link` e controle o `value` de `Tabs`
  pela rota atual (`usePathname()`), sem `onValueChange`.
- **`ComboboxInput` dimensiona errado:** o wrapper é `w-fit` *a menos que encontre um filho `.w-full`*
  — aí ele estica e o input mantém a largura dada, partindo o campo em duas metades com o chevron
  perdido à direita. Use `w-72 max-w-full` (ou `w-full` puro), **nunca** `w-full sm:w-72`.
- **`Checkbox` tem o estado indeterminado desenhado (`indeterminate` → traço "−")**: o Base UI monta
  o indicador também nele, e a troca ✓/− é por CSS (`in-data-indeterminate`). Não reintroduza um
  segundo indicador por prop.
- **Escape num `ComboboxInput`/`ComboboxChipsInput` com o popup fechado não limpa o campo:** o Base UI
  trata isso como "limpar" (texto **e** seleção). O wrapper neutraliza (`keepValueOnEscape`); não
  reintroduza um `onKeyDown` que devolva o comportamento nativo.

---
> Instalou, atualizou ou removeu um primitivo? Atualize a tabela na mesma mudança. Detalhe de prop
> pertence ao TSDoc do arquivo, não a esta tabela.
