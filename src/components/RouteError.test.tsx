import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { messages, renderWithIntl } from '@/test/intl'
import { RouteError } from './RouteError'

jest.mock('@iconify/react', () => ({ Icon: () => <span /> }))

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

it.each(['page', 'shell'] as const)('shows the message and retries (%s)', async (variant) => {
  const onRetry = jest.fn()
  const user = userEvent.setup()
  renderWithIntl(<RouteError error={new Error('boom')} onRetry={onRetry} variant={variant} />)

  expect(screen.getByText(messages.ErrorPage.title)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: messages.common.retry }))

  expect(onRetry).toHaveBeenCalledTimes(1)
})

it('shows the digest so a report can be matched to the server log, and logs the error', () => {
  const error = Object.assign(new Error('boom'), { digest: 'abc123' })
  renderWithIntl(<RouteError error={error} onRetry={jest.fn()} variant="page" />)

  expect(
    screen.getByText(messages.ErrorPage.reference.replace('{digest}', 'abc123'))
  ).toBeInTheDocument()
  expect(console.error).toHaveBeenCalledWith('[route-error]', 'abc123', error)
})

it('omits the reference line when Next gave no digest', () => {
  renderWithIntl(<RouteError error={new Error('boom')} onRetry={jest.fn()} variant="page" />)

  expect(screen.queryByText(/Referência|Reference/)).not.toBeInTheDocument()
})
