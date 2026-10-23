import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

jest.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}))

it('renders the title, description and action', () => {
  render(
    <EmptyState
      icon="lucide:inbox"
      title="Nothing here"
      description="Create the first item."
      action={<button type="button">Create</button>}
    />
  )

  expect(screen.getByText('Nothing here')).toBeInTheDocument()
  expect(screen.getByText('Create the first item.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  expect(screen.getByTestId('icon')).toHaveAttribute('data-icon', 'lucide:inbox')
})

it('renders the compact plain variant without a description', () => {
  render(<EmptyState variant="plain" title="No results" />)

  expect(screen.getByText('No results')).toBeInTheDocument()
})
