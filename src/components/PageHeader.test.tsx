import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

jest.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}))

it('renders the title as a heading with the subtitle and icon', () => {
  render(<PageHeader icon="lucide:settings" title="Settings" subtitle="Manage your information." />)

  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  expect(screen.getByText('Manage your information.')).toBeInTheDocument()
  expect(screen.getByTestId('icon')).toHaveAttribute('data-icon', 'lucide:settings')
})

it('omits the subtitle paragraph when none is provided', () => {
  render(<PageHeader icon="lucide:settings" title="Settings" />)

  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  expect(screen.queryByText('Manage your information.')).not.toBeInTheDocument()
})

it('renders a trailing action when provided', () => {
  render(<PageHeader icon="lucide:settings" title="Settings" action={<span>Save</span>} />)

  expect(screen.getByText('Save')).toBeInTheDocument()
})
