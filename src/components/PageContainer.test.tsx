import { render, screen } from '@testing-library/react'
import { PageContainer } from './PageContainer'

it('renders its children inside a main landmark with the standard width', () => {
  render(<PageContainer>content</PageContainer>)

  const main = screen.getByRole('main')
  expect(main).toHaveTextContent('content')
  expect(main).toHaveClass('max-w-6xl')
})

it('widens to the fluid shell on request', () => {
  render(<PageContainer fluid>content</PageContainer>)

  expect(screen.getByRole('main')).toHaveClass('max-w-[110rem]')
})
