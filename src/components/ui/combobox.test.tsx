import { fireEvent, render, screen } from '@testing-library/react'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxInput,
} from './combobox'

const ITEMS = ['Alpha', 'Beta']

describe('Combobox — Escape with the popup closed', () => {
  // Por quê: o Base UI trata Escape com o popup fechado como "limpar" (texto + seleção). Em campos
  // cujo valor é gravado na hora (tags, atendente), isso apagava o dado ao fechar um diálogo.
  it('keeps the selection of a multi-select (chips) field', () => {
    const onValueChange = jest.fn()
    render(
      <Combobox items={ITEMS} multiple value={['Alpha']} onValueChange={onValueChange}>
        <ComboboxChips>
          <ComboboxChip>Alpha</ComboboxChip>
          <ComboboxChipsInput aria-label="tags" />
        </ComboboxChips>
      </Combobox>
    )

    fireEvent.keyDown(screen.getByLabelText('tags'), { key: 'Escape' })

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps the selection of a single-select field', () => {
    const onValueChange = jest.fn()
    render(
      <Combobox items={ITEMS} value="Alpha" onValueChange={onValueChange}>
        <ComboboxInput aria-label="agent" />
      </Combobox>
    )

    fireEvent.keyDown(screen.getByLabelText('agent'), { key: 'Escape' })

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('still calls a consumer-provided onKeyDown', () => {
    const onKeyDown = jest.fn()
    render(
      <Combobox items={ITEMS} value="Alpha">
        <ComboboxInput aria-label="agent" onKeyDown={onKeyDown} />
      </Combobox>
    )

    fireEvent.keyDown(screen.getByLabelText('agent'), { key: 'Escape' })

    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })
})
