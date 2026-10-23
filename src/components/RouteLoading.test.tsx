import { screen } from '@testing-library/react'
import { messages, renderWithIntl } from '@/test/intl'
import { RouteLoading } from './RouteLoading'

jest.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}))

it('renders a labelled loading status', () => {
  renderWithIntl(<RouteLoading />)

  expect(screen.getByRole('status', { name: messages.navigation.loading })).toBeInTheDocument()
})

it('shows a spinner inside the status', () => {
  renderWithIntl(<RouteLoading />)

  // A visual spinner is present; the exact icon is cosmetic, so don't pin its id.
  expect(screen.getByRole('status')).toContainElement(screen.getByTestId('icon'))
})
