import { render, screen } from '@testing-library/react'
import { Skeleton } from './skeleton'

it('renders a pulsing placeholder and merges custom classes', () => {
  render(<Skeleton className="size-32" data-testid="sk" />)
  const el = screen.getByTestId('sk')
  expect(el).toHaveClass('animate-pulse')
  expect(el).toHaveClass('size-32')
})
