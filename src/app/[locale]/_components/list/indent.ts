// Recuo por nível (20 px = `TODO_INDENT_PX`), em classes estáticas para o Tailwind enxergá-las.
// Se `TODO_MAX_DEPTH` ou o passo do recuo mudarem, atualize esta lista junto.
const INDENT_CLASSES = [
  'ps-3',
  'ps-[2rem]',
  'ps-[3.25rem]',
  'ps-[4.5rem]',
  'ps-[5.75rem]',
  'ps-[7rem]',
] as const

/** A classe de padding inicial de uma linha no nível `depth` (0 = raiz). */
export function indentClass(depth: number): string {
  return INDENT_CLASSES[Math.min(Math.max(depth, 0), INDENT_CLASSES.length - 1)]
}
