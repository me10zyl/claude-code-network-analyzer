import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DetailTabs } from '@/components/detail/detail-tabs'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, ConversationTurn, RequestDiffSummary } from '@/lib/models/semantic'
import { useUiStore } from '@/stores/ui-store'

function createRequest(): NormalizedClaudeRequest {
  return {
    id: 'req-1',
    index: 1,
    startedAt: Date.parse('2026-04-01T10:00:00.000Z'),
    durationMs: 321,
    host: 'api.anthropic.com',
    pathname: '/v1/messages',
    method: 'POST',
    status: 200,
    requestHeaders: {
      'content-type': 'application/json',
    },
    responseHeaders: {
      'content-type': 'text/event-stream',
    },
    body: {
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: 'Search for network analyzer detail panel examples.',
        },
      ],
      tools: [
        {
          name: 'WebSearch',
          description: 'Search the web',
          input_schema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
          },
        },
      ],
    },
    rawRequestText: JSON.stringify({ body: 'request' }, null, 2),
    rawResponseText: JSON.stringify({ body: 'response' }, null, 2),
    reconstructedMessage: {
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'WebSearch',
          input: { query: 'network table' },
          inputText: '{"query":"network table"}',
        },
      ],
      stopReason: 'tool_use',
      usage: {
        output_tokens: 12,
      },
    },
  }
}

function createClassification(): ClassifiedRequest {
  return {
    requestId: 'req-1',
    stepType: 'tool_call',
    confidence: 0.99,
    reasons: ['assistant emitted tool_use content'],
    toolCalls: [{ id: 'toolu_1', name: 'WebSearch' }],
    hasToolResult: false,
    hasThinking: false,
  }
}

function createDiff(): RequestDiffSummary {
  return {
    changed: true,
    systemChanged: false,
    toolsChanged: true,
    messagesChanged: true,
    toolResultsAdded: 1,
    assistantOutputChanged: true,
    summaryLines: ['Tool definitions changed.', 'Added 1 tool result block.'],
  }
}

function createTurns(): ConversationTurn[] {
  return [
    {
      id: 'turn-1',
      startedAt: Date.parse('2026-04-01T10:00:00.000Z'),
      endedAt: Date.parse('2026-04-01T10:00:02.000Z'),
      steps: [
        {
          id: 'step-req-1',
          requestId: 'req-1',
          type: 'tool_call',
          title: 'tool call',
          summary: 'assistant emitted tool_use content',
          toolNames: ['WebSearch'],
          startedAt: Date.parse('2026-04-01T10:00:00.000Z'),
        },
      ],
    },
  ]
}

describe('DetailTabs', () => {
  beforeEach(() => {
    useUiStore.setState({ leftPaneMode: 'requests', activeDetailTab: 'summary' })
  })

  it('switches tab panels and only shows tools and timeline content after selecting those tabs', async () => {
    const user = userEvent.setup()

    render(
      <DetailTabs
        request={createRequest()}
        classified={createClassification()}
        diff={createDiff()}
        turns={createTurns()}
      />,
    )

    expect(screen.getByText('Request #1')).toBeInTheDocument()
    expect(screen.getAllByText('assistant emitted tool_use content').length).toBeGreaterThan(0)
    expect(screen.queryByText('Tool definitions')).not.toBeInTheDocument()
    expect(screen.queryByText('Turn context')).not.toBeInTheDocument()
    expect(screen.queryByText('Diff summary')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tools' }))

    expect(screen.queryByText('Request #1')).not.toBeInTheDocument()
    expect(screen.getByText('Tool calls')).toBeInTheDocument()
    expect(screen.getAllByText('WebSearch').length).toBeGreaterThan(0)
    expect(screen.getByText('Tool definitions')).toBeInTheDocument()
    expect(screen.queryByText('Turn context')).not.toBeInTheDocument()
    expect(screen.queryByText('Diff summary')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Diff' }))

    expect(screen.getByText('Diff summary')).toBeInTheDocument()
    expect(screen.getAllByText('Tool definitions changed.').length).toBeGreaterThan(0)
    expect(screen.queryByText('Tool definitions')).not.toBeInTheDocument()
    expect(screen.queryByText('Turn context')).not.toBeInTheDocument()
    expect(screen.queryByText('Request #1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Timeline context' }))

    expect(screen.getByText('Turn context')).toBeInTheDocument()
    expect(screen.getAllByText('assistant emitted tool_use content').length).toBeGreaterThan(0)
    expect(screen.queryByText('Tool definitions')).not.toBeInTheDocument()
    expect(screen.queryByText('Request #1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overview' }))

    expect(screen.getByText('Request #1')).toBeInTheDocument()
    expect(screen.getAllByText('Tool definitions changed.').length).toBeGreaterThan(0)
    expect(screen.queryByText('Turn context')).not.toBeInTheDocument()
  })
})
