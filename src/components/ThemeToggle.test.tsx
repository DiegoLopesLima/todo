import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { messages, renderWithIntl } from '@/test/intl'
import { ThemeToggle } from './ThemeToggle'

const mockSetTheme = jest.fn()
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme: mockSetTheme }),
}))
jest.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}))

beforeEach(() => {
  jest.clearAllMocks()
})

it('renders a labelled trigger', () => {
  renderWithIntl(<ThemeToggle />)
  expect(screen.getByRole('button', { name: 'Tema' })).toBeInTheDocument()
})

it('switches the theme when an option is chosen', async () => {
  const user = userEvent.setup()
  renderWithIntl(<ThemeToggle />)

  await user.click(screen.getByRole('button', { name: 'Tema' }))
  await user.click(await screen.findByText(messages.theme.dark))

  // Base UI passes (value, eventDetails) to onValueChange; assert the value.
  expect(mockSetTheme.mock.calls[0]?.[0]).toBe('dark')
})
