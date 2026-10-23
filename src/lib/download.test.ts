import { downloadTextFile, readFileAsText } from '@/lib/download'

describe('downloadTextFile', () => {
  const create = jest.fn(() => 'blob:fake')
  const revoke = jest.fn()

  beforeEach(() => {
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
    create.mockClear()
    revoke.mockClear()
  })

  it('cria um link com o nome do arquivo, clica nele e o remove', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadTextFile('dados.json', '{"a":1}')

    expect(create).toHaveBeenCalledTimes(1)
    const blob = (create.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('application/json')
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('só libera a URL depois do clique', () => {
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadTextFile('dados.json', 'x')
    expect(revoke).not.toHaveBeenCalled()
    jest.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:fake')
  })
})

describe('readFileAsText', () => {
  it('lê o conteúdo de um arquivo como texto (UTF-8)', async () => {
    const file = new File(['olá, ação'], 'a.json', { type: 'application/json' })
    await expect(readFileAsText(file)).resolves.toBe('olá, ação')
  })

  it('rejeita quando a leitura falha', async () => {
    const reader = jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (
      this: FileReader
    ) {
      queueMicrotask(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>))
    })
    await expect(readFileAsText(new Blob(['x']))).rejects.toBeInstanceOf(Error)
    reader.mockRestore()
  })
})
