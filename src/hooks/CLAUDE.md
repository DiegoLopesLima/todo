# `src/hooks/` — hooks React próprios

**Antes de escrever um hook:** confira [usehooks-ts](https://usehooks-ts.com/) e esta lista. Só crie
um hook próprio quando não existir em nenhum dos dois.

| Hook · import `@/hooks/<arquivo>` | Assinatura | Para que serve |
|---|---|---|
| `useThemeChoice` | `() => { theme, current, triggerIcon, selectTheme }` | Tema atual (protegido contra mismatch de hidratação), ícone do gatilho e o setter. Exporta `THEMES`, `THEME_ICONS`, `ThemeChoice`. Base do `ThemeToggle`. |
| `useLocaleChoice` | `() => { locale, isPending, selectLocale }` | Troca o idioma re-renderizando a mesma rota sob o novo locale. Exporta `LOCALES`, `LOCALE_FLAGS`. Base do `LocaleSwitcher`. |
| `useToday` | `() => DateKey` | O dia local (`YYYY-MM-DD`), que vira sozinho na meia-noite e ao voltar foco/visibilidade da aba. |

---
> Hook novo? Adicione a linha na mesma mudança.
