import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('shows the empty upload state before any HAR file is loaded', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Claude Code Network Analyzer' })).toBeInTheDocument()
    expect(screen.getByText('Upload HAR')).toBeInTheDocument()
    expect(screen.getByText('No HAR session loaded')).toBeInTheDocument()
  })
})
