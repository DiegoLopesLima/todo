import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { messages, renderWithIntl } from '@/test/intl'
import { LocaleSwitcher } from './LocaleSwitcher'

const mockReplace = jest.fn()
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/dashboard',
}))
jest.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}))

beforeEach(() => {
  jest.clearAllMocks()
})

it('renders a labelled trigger', () => {
  renderWithIntl(<LocaleSwitcher />)
  expect(screen.getByRole('button', { name: 'Idioma' })).toBeInTheDocument()
})

it('shows the active locale flag on the trigger', () => {
  renderWithIntl(<LocaleSwitcher />)
  const trigger = screen.getByRole('button', { name: 'Idioma' })
  // pt-BR is the active locale in tests → Brazilian flag.
  expect(trigger.querySelector('[data-icon="circle-flags:br"]')).toBeInTheDocument()
})

it('replaces the route under the selected locale, keeping the path', async () => {
  const user = userEvent.setup()
  renderWithIntl(<LocaleSwitcher />)

  await user.click(screen.getByRole('button', { name: 'Idioma' }))
  await user.click(await screen.findByText(messages.languages.en))

  expect(mockReplace).toHaveBeenCalledWith('/dashboard', { locale: 'en' })
})
