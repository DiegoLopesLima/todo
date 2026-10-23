/**
 * A largura da página, que cresce com a tela em vez de parar numa coluna estreita: ~36rem no
 * celular grande, 42 em tablets, 48 em notebooks e 56 em monitores largos. Uma lista de tarefas lê
 * melhor numa coluna do que esticada, mas as colunas estreitas deixavam metade do monitor vazia.
 * Classes estáticas (o Tailwind precisa vê-las inteiras).
 */
export const PAGE_WIDTH = 'mx-auto w-full max-w-xl sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl'

/** O respiro lateral, que também cresce com a tela. */
export const PAGE_GUTTER = 'px-4 sm:px-6 lg:px-8'

/** O espaço vertical entre os blocos da coluna principal. */
export const SECTION_GAP = 'gap-3 sm:gap-4'

/** O mesmo espaço em pixels (`gap-3` / `gap-4`), para a animação de abrir/fechar blocos. */
export const SECTION_GAP_PX = { base: 12, sm: 16 } as const
