# `src/app/[locale]/_components/` — a tela de tarefas

Componentes **só desta página** (a home do app). O prefixo `_` torna a pasta privada: o Next não a
roteia. O que for reaproveitável fora daqui sobe para `src/components/`. Regras de negócio:
[`docs/modules/todo`](../../../../docs/modules/todo/rules.md); domínio puro: [`lib/todo`](../../../lib/todo/CLAUDE.md).

**A lista nunca muda por conta própria**: toda mudança passa por `useTodoActions` → `dispatch` da store
(`@/store/todo-document`). Componente nenhum monta um item à mão.

## Estrutura

| Pasta · arquivo | O que é |
|---|---|
| `TodoScreen` | A tela inteira: cabeçalho, criação rápida, visões + busca, lista, região `aria-live`, celebração. |
| `TodoSkeleton` | Esqueleto (Suspense, 1º render, HTML estático/offline). `TodoListSkeleton` é só a lista. |
| `state/useTodoView` | Visão (`?v=`) e busca (`?q=`) na URL (nuqs). Exige Suspense acima. |
| `state/useTodoRows` | Linhas visíveis (`buildVisibleRows`) para visão + busca + recolhidos + itens segurados. |
| `state/useTodoActions` | **As ações da interface** (`toggle`, `create`, `edit`, `remove`, `move*`, `undo`, `redo`…): dão o feedback (toast de erro/desfazer, anúncio, celebração) e são estáveis por locale. |
| `state/useTodoShortcuts` · `shortcuts` | Atalhos globais (Ctrl/⌘+Z, `/`, `n`, `?`); `matchShortcut` é puro e testado. |
| `state/useModalOpen` | Registra diálogo aberto: os atalhos globais ficam quietos. |
| `header/` | `TodoHeader`, `DayProgress` (anel + sequência), `UndoRedoButtons`. |
| `toolbar/` | `ViewTabs` (Hoje/Próximos/Todos), `SearchField`. |
| `quick-add/` | `QuickAddBar`: criar com Enter, **uma linha só** dentro do grupo do campo — `PriorityMenu` (dropdown; Normal marcada), `ScheduleControl` (abre o modal `ScheduleDialog` com calendário e repetição), `ParentPicker` ("dentro de…", combobox com busca) e o botão com `↵`. Até o breakpoint `md` os controles são só ícones; a barra fica fixa na base no celular. `schedule.ts`: o "quando" ainda não criado (tipo, resumo, ponte com o formulário). |
| `layout` | `PAGE_WIDTH`/`PAGE_GUTTER`: a largura da página cresce por breakpoint (xl → 2xl → 3xl → 4xl). Use-os em vez de um `max-w-*` solto. |
| `list/` | `TodoList` (foco rolante, navegação, edição/subitem inline), `TodoRow` (a linha), `RowCheck`, `RowBadges`, `RowMenu`, `InlineEditor`, `PriorityFlag`, `TodoListContext`, `indent`. |
| `details/` | `ItemDetailsSheet` (datas + repetição), `RepeatFields`, `DateField`, `ParentCombobox`, `MoveToDialog`. |
| `feedback/` | `LiveRegion`, `StatusBanners`, `CelebrationLayer` (confete), `ShortcutsDialog`. |

## Regras desta pasta

- **A linha inteira é o alvo do clique.** Todo controle dentro da linha (chevron, lápis, menu) chama
  `event.stopPropagation()`. **O conteúdo portalizado (menu, popover) também**: o clique borbulha pela
  árvore do React até a linha. Duplo clique **não** edita.
- **Foco rolante**: a lista é uma única parada de Tab (`tabIndex` 0 só na linha atual); setas/`j`/`k`
  percorrem; os controles internos têm `tabIndex={-1}`.
- Recuo por nível usa classes **estáticas** (`list/indent.ts`) — nunca monte `ps-[${n}rem]` por template.
- **Atalho exibido = `Kbd`** (nunca texto solto): tooltips (`IconButton shortcut`), o botão de adicionar (`↵`), as dicas `N` e `/` nos campos e a lista do `?`. Tecla de modificador vem de `modKeyLabel()` (⌘ ou Ctrl) e só é chamada onde o resultado aparece depois da hidratação.
- **Toda aparição/saída tem movimento, e só a PESSOA a causa:** linhas excluídas/escondidas por recolher saem animadas (`AnimatePresence` em `TodoList`, `custom` = trocou de aba/busca/arrasto ⇒ saída instantânea); blocos da coluna (avisos) abrem e fecham com `feedback/Reveal`; o que aparece sozinho usa `motion-safe:animate-in` (sempre com `motion-safe:`, para respeitar `prefers-reduced-motion`). Linha em saída fica `aria-hidden`.
- **Diálogo/menu aberto de dentro de um `<form>` não pode borbulhar `submit`**: o React propaga o evento pelo portal até o formulário de fora. O modal do campo de criação fica FORA do `<form>` e o formulário dele chama `stopPropagation()`.
- Animação de movimento respeita `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` em
  `TodoApp`; `motion-safe:`/`motion-reduce:` nas classes). O confete é carregado sob demanda.
- Texto visível: namespace `todo` de `messages/*.json` (pt-BR **e** en). Erros de comando:
  `todo.errors.<motivo>`; rótulo de ação desfeita: `todo.undo.actions.<comando>`.

---
> Componente novo desta tela? Adicione a linha na mesma mudança.
