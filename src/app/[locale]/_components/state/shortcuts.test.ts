import { isEditableTarget, matchShortcut } from './shortcuts'

function press(
  init: Partial<Parameters<typeof matchShortcut>[0]> & { key: string },
  isMac = false
) {
  return matchShortcut(
    {
      code: '',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      isComposing: false,
      target: document.body,
      ...init,
    },
    isMac
  )
}

describe('matchShortcut', () => {
  describe('desfazer e refazer', () => {
    it('Ctrl+Z desfaz e Ctrl+Shift+Z refaz (fora do macOS)', () => {
      expect(press({ key: 'z', code: 'KeyZ', ctrlKey: true })).toBe('undo')
      expect(press({ key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true })).toBe('redo')
    })

    it('Ctrl+Y refaz fora do macOS, mas não no macOS', () => {
      expect(press({ key: 'y', code: 'KeyY', ctrlKey: true })).toBe('redo')
      expect(press({ key: 'y', code: 'KeyY', metaKey: true }, true)).toBeNull()
    })

    it('no macOS vale ⌘, e Ctrl não', () => {
      expect(press({ key: 'z', code: 'KeyZ', metaKey: true }, true)).toBe('undo')
      expect(press({ key: 'z', code: 'KeyZ', metaKey: true, shiftKey: true }, true)).toBe('redo')
      expect(press({ key: 'z', code: 'KeyZ', ctrlKey: true }, true)).toBeNull()
    })

    it('usa a posição da tecla, então funciona em outro alfabeto', () => {
      expect(press({ key: 'я', code: 'KeyZ', ctrlKey: true })).toBe('undo')
    })

    it('dentro de um campo de texto o desfazer é do campo', () => {
      const input = document.createElement('input')
      expect(press({ key: 'z', code: 'KeyZ', ctrlKey: true, target: input })).toBeNull()
      const area = document.createElement('textarea')
      expect(press({ key: 'z', code: 'KeyZ', ctrlKey: true, target: area })).toBeNull()
    })

    it('durante a composição de um caractere (IME) não é atalho', () => {
      expect(press({ key: 'z', code: 'KeyZ', ctrlKey: true, isComposing: true })).toBeNull()
    })

    it('Ctrl+Alt+Z não é desfazer', () => {
      expect(press({ key: 'z', code: 'KeyZ', ctrlKey: true, altKey: true })).toBeNull()
    })
  })

  describe('atalhos de uma tecla', () => {
    it('/ busca, n cria, ? ajuda', () => {
      expect(press({ key: '/' })).toBe('search')
      expect(press({ key: 'n' })).toBe('newTask')
      expect(press({ key: '?' })).toBe('help')
    })

    it('não agem enquanto a pessoa digita', () => {
      const input = document.createElement('input')
      expect(press({ key: 'n', target: input })).toBeNull()
      expect(press({ key: '/', target: input })).toBeNull()
    })

    it('não agem com modificador (deixa os atalhos do navegador em paz)', () => {
      expect(press({ key: 'n', ctrlKey: true })).toBeNull()
      expect(press({ key: 'n', metaKey: true })).toBeNull()
      expect(press({ key: 'n', altKey: true })).toBeNull()
    })

    it('outras teclas não são atalho', () => {
      expect(press({ key: 'a' })).toBeNull()
    })
  })
})

describe('isEditableTarget', () => {
  it('reconhece campos e contenteditable; o resto não', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true)
    expect(isEditableTarget(document.createElement('select'))).toBe(true)
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isEditableTarget(editable)).toBe(true)
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})
