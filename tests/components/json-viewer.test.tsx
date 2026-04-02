import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { JsonViewer } from '@/components/common/json-viewer'

describe('JsonViewer', () => {
  it('renders nested values expanded by default', () => {
    render(
      <JsonViewer
        title="Parsed request body"
        value={{
          messages: [
            {
              role: 'user',
              content: 'hello world',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Parsed request body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse messages' })).toBeInTheDocument()
    expect(screen.getByText('"role"')).toBeInTheDocument()
    expect(screen.getByText('"content"')).toBeInTheDocument()
  })

  it('collapses nested collection fields when toggled', async () => {
    const user = userEvent.setup()

    render(
      <JsonViewer
        value={{
          messages: [
            {
              role: 'user',
              content: 'hello world',
            },
          ],
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Collapse messages' }))

    expect(screen.getByRole('button', { name: 'Expand messages' })).toBeInTheDocument()
    expect(screen.queryByText('role')).not.toBeInTheDocument()
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('renders strings with actual line breaks when content contains newlines', () => {
    render(
      <JsonViewer
        value={{
          content: 'first line\nsecond line',
        }}
      />,
    )

    const multilineValue = screen.getByText((_, element) => element?.textContent === '"first line\nsecond line"')

    expect(multilineValue).toBeInTheDocument()
    expect(multilineValue.textContent).toContain('\n')
    expect(multilineValue.textContent).not.toContain('\\n')
  })

  it('defers rendering children for very large collections until requested', async () => {
    const user = userEvent.setup()

    render(
      <JsonViewer
        value={{
          content: Array.from({ length: 45 }, (_, index) => `item-${index}`),
        }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Render first 40 items' })).toBeInTheDocument()
    expect(screen.getByText('45 items deferred')).toBeInTheDocument()
    expect(screen.queryByText('"item-44"')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Render first 40 items' }))

    expect(screen.getByText('"item-39"')).toBeInTheDocument()
    expect(screen.queryByText('"item-44"')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Render next 5 items' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Render next 5 items' }))

    expect(screen.getByText('"item-44"')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Render next 5 items' })).not.toBeInTheDocument()
  })

  it('keeps the empty-state behavior for null values', () => {
    render(<JsonViewer value={null} emptyLabel="No parsed request body" />)

    expect(screen.getByText('No parsed request body')).toBeInTheDocument()
  })
})
