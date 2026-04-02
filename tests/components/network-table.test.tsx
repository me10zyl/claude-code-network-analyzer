import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NetworkTable } from '@/components/network/network-table'
import type { ClassifiedRequest, RequestDiffSummary } from '@/lib/models/semantic'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'

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
    requestHeaders: {},
    responseHeaders: {},
    body: {
      model: 'claude-sonnet-4-5',
      messages: [],
      tools: [{ name: 'WebSearch' }],
    },
    rawRequestText: '{}',
    rawResponseText: '',
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

function createClassificationWithDuplicateToolNames(): ClassifiedRequest {
  return {
    requestId: 'req-1',
    stepType: 'tool_call',
    confidence: 0.99,
    reasons: ['assistant emitted tool_use content'],
    toolCalls: [
      { id: 'toolu_1', name: 'Agent' },
      { id: 'toolu_2', name: 'Agent' },
    ],
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
    summaryLines: ['Added 1 tool result block.'],
  }
}

describe('NetworkTable', () => {
  it('renders step, tool badges, stop reason, model, and diff summary cells', () => {
    render(
      <NetworkTable
        requests={[createRequest()]}
        classified={[createClassification()]}
        diffs={[{ requestId: 'req-1', summary: createDiff() }]}
        selectedRequestId={null}
        onSelectRequest={() => {}}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument()
    expect(screen.getByText('tool_call')).toBeInTheDocument()
    expect(screen.getByText('WebSearch')).toBeInTheDocument()
    expect(screen.getAllByText('tool_use').length).toBeGreaterThan(0)
    expect(screen.getByText('Added 1 tool result block.')).toBeInTheDocument()
  })

  it('associates classifications by requestId instead of array index', () => {
    const request = createRequest()
    const unrelatedClassification: ClassifiedRequest = {
      requestId: 'req-2',
      stepType: 'final_answer',
      confidence: 0.8,
      reasons: ['different request'],
      toolCalls: [],
      hasToolResult: false,
      hasThinking: false,
    }

    render(
      <NetworkTable
        requests={[request]}
        classified={[unrelatedClassification, createClassification()]}
        diffs={[{ requestId: 'req-1', summary: createDiff() }]}
        selectedRequestId={null}
        onSelectRequest={() => {}}
      />,
    )

    expect(screen.getByText('tool_call')).toBeInTheDocument()
    expect(screen.getByText('WebSearch')).toBeInTheDocument()
    expect(screen.queryByText('final_answer')).not.toBeInTheDocument()
  })

  it('deduplicates repeated tool badges for the same request', () => {
    render(
      <NetworkTable
        requests={[createRequest()]}
        classified={[createClassificationWithDuplicateToolNames()]}
        diffs={[{ requestId: 'req-1', summary: createDiff() }]}
        selectedRequestId={null}
        onSelectRequest={() => {}}
      />,
    )

    expect(screen.getAllByText('Agent')).toHaveLength(1)
  })
})
