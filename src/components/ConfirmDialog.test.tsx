import { fireEvent, screen } from '@testing-library/react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { renderWithIntl } from '@/test/intl'

jest.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}))

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = jest.fn()
  const onOpenChange = jest.fn()
  renderWithIntl(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Excluir contato?"
      description="Isso não pode ser desfeito."
      cancelLabel="Cancelar"
      confirmLabel="Excluir"
      onConfirm={onConfirm}
      {...props}
    />
  )
  return { onConfirm, onOpenChange }
}

it('renders the copy and runs onConfirm from the confirm button', () => {
  const { onConfirm } = renderDialog()

  expect(screen.getByText('Excluir contato?')).toBeInTheDocument()
  expect(screen.getByText('Isso não pode ser desfeito.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
})

it('locks both buttons and shows a spinner while pending', () => {
  renderDialog({ pending: true })

  expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.getByTestId('icon')).toHaveAttribute('data-icon', 'lucide:loader-circle')
})

it('holds only the confirm button while confirmDisabled', () => {
  renderDialog({ confirmDisabled: true })

  expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
})
