/**
 * Baixa um texto como arquivo, sem passar por servidor (o app não tem). Exceção documentada à regra de
 * HTTP via Axios (`CLAUDE.md`): é um download de blob feito no navegador.
 */
export function downloadTextFile(filename: string, text: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revogar já poderia cancelar o download em alguns navegadores; adia para depois do clique.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Lê um arquivo como texto. Usa `FileReader` em vez de `Blob#text()` porque este não existe em
 * navegadores um pouco mais antigos (Safari < 14) nem no jsdom dos testes.
 */
export function readFileAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsText(file)
  })
}
