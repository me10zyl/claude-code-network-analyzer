import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import HomePage from '@/app/page'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, RequestDiffSummary } from '@/lib/models/semantic'
import { useFilterStore } from '@/stores/filter-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useSessionStore } from '@/stores/session-store'
import { useUiStore } from '@/stores/ui-store'

function createRequest(id: string, index: number, pathname: string): NormalizedClaudeRequest {
  return {
    id,
    index,
    startedAt: Date.parse(`2026-04-01T10:00:0${index}.000Z`),
    durationMs: 321,
    host: 'api.anthropic.com',
    pathname,
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
          id: `toolu_${index}`,
          name: 'WebSearch',
          input: { query: pathname },
          inputText: JSON.stringify({ query: pathname }),
        },
      ],
      stopReason: 'tool_use',
      usage: {
        output_tokens: 12,
      },
    },
  }
}

function createClassification(requestId: string, stepType: ClassifiedRequest['stepType']): ClassifiedRequest {
  return {
    requestId,
    stepType,
    confidence: 0.99,
    reasons: [`${stepType} classification`],
    toolCalls: stepType === 'tool_call' ? [{ id: `tool-${requestId}`, name: 'WebSearch' }] : [],
    hasToolResult: false,
    hasThinking: false,
  }
}

function createDiff(requestId: string, summaryLine: string): { requestId: string; summary: RequestDiffSummary } {
  return {
    requestId,
    summary: {
      changed: true,
      systemChanged: false,
      toolsChanged: true,
      messagesChanged: true,
      toolResultsAdded: 1,
      assistantOutputChanged: true,
      summaryLines: [summaryLine],
    },
  }
}

function createTurns(
  steps: Array<{
    requestId: string
    stepType: ClassifiedRequest['stepType']
    summary: string
    title?: string
    toolNames?: string[]
  }>,
) {
  return [
    {
      id: 'turn-1',
      startedAt: Date.parse('2026-04-01T10:00:01.000Z'),
      endedAt: Date.parse('2026-04-01T10:00:02.000Z'),
      steps: steps.map(({ requestId, stepType, summary, title, toolNames }, index) => ({
        id: `step-${requestId}-${index + 1}`,
        requestId,
        type: stepType,
        title: title ?? stepType.replace('_', ' '),
        summary,
        toolNames: toolNames ?? (stepType === 'tool_call' ? ['WebSearch'] : []),
        startedAt: Date.parse(`2026-04-01T10:00:0${index + 1}.000Z`),
      })),
    },
  ]
}

describe('HomePage', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, loading: false, error: null })
    useSelectionStore.setState({ selectedRequestId: null })
    useFilterStore.setState({ search: '', stepType: 'all' })
    useUiStore.setState({ leftPaneMode: 'requests', activeDetailTab: 'summary' })
  })

  it('shows the empty upload state before any HAR file is loaded', () => {
    render(<HomePage />)

    expect(screen.getByText('Upload HAR')).toBeInTheDocument()
    expect(screen.getByText('No HAR session loaded')).toBeInTheDocument()
    expect(screen.getByText('Select a Claude Code HAR export to inspect request flows, tools, and diffs.')).toBeInTheDocument()
  })

  it('filters by stepType using requestId associations instead of array indexes', () => {
    const requestOne = createRequest('req-1', 1, '/tool-call')
    const requestTwo = createRequest('req-2', 2, '/final-answer')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [requestOne, requestTwo],
          classified: [createClassification('req-2', 'final_answer'), createClassification('req-1', 'tool_call')],
          turns: createTurns([{ requestId: 'req-1', stepType: 'tool_call', summary: 'assistant emitted tool_use content' }]),
          diffs: [createDiff('req-1', 'Matched tool call'), createDiff('req-2', 'Matched final answer')],
          stats: {
            totalEntries: 2,
            claudeRequests: 2,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
      useFilterStore.setState({ search: '', stepType: 'tool_call' })
    })

    expect(screen.getAllByText('Matched tool call').length).toBeGreaterThan(0)
    expect(screen.queryByText('Matched final answer')).not.toBeInTheDocument()
    expect(screen.getAllByText('Request #1').length).toBeGreaterThan(0)
    expect(screen.queryByText('Request #2')).not.toBeInTheDocument()
  })

  it('filters by search using requestId associations instead of array indexes', () => {
    const requestOne = createRequest('req-1', 1, '/search-hit')
    const requestTwo = createRequest('req-2', 2, '/search-miss')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [requestOne, requestTwo],
          classified: [createClassification('req-2', 'final_answer'), createClassification('req-1', 'tool_call')],
          turns: createTurns([{ requestId: 'req-1', stepType: 'tool_call', summary: 'assistant emitted tool_use content' }]),
          diffs: [createDiff('req-1', 'Diff contains special needle'), createDiff('req-2', 'Ordinary summary')],
          stats: {
            totalEntries: 2,
            claudeRequests: 2,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
      useFilterStore.setState({ search: 'special needle', stepType: 'all' })
    })

    expect(screen.getAllByText('Diff contains special needle').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ordinary summary')).not.toBeInTheDocument()
    expect(screen.getAllByText('Request #1').length).toBeGreaterThan(0)
    expect(screen.queryByText('Request #2')).not.toBeInTheDocument()
  })

  it('shows timeline view in the left pane when timeline mode is selected with a loaded session', () => {
    const request = createRequest('req-1', 1, '/timeline-toggle')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [request],
          classified: [createClassification('req-1', 'tool_call')],
          turns: createTurns([{ requestId: 'req-1', stepType: 'tool_call', summary: 'assistant emitted tool_use content' }]),
          diffs: [createDiff('req-1', 'Timeline toggle still shows the table')],
          stats: {
            totalEntries: 1,
            claudeRequests: 1,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
      useUiStore.setState({ leftPaneMode: 'timeline', activeDetailTab: 'summary' })
    })

    expect(screen.getByRole('button', { name: /turn-1.*tool_call.*assistant emitted tool_use content/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Time' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Request #1' })).toBeInTheDocument()
  })

  it('preserves the full turn context in the detail timeline tab after filtering requests', () => {
    const requestOne = createRequest('req-1', 1, '/tool-call')
    const requestTwo = createRequest('req-2', 2, '/final-answer')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [requestOne, requestTwo],
          classified: [createClassification('req-1', 'tool_call'), createClassification('req-2', 'final_answer')],
          turns: createTurns([
            { requestId: 'req-1', stepType: 'tool_call', summary: 'assistant called WebSearch' },
            { requestId: 'req-2', stepType: 'final_answer', summary: 'assistant produced the final answer', toolNames: [] },
          ]),
          diffs: [createDiff('req-1', 'Tool call row'), createDiff('req-2', 'Final answer row')],
          stats: {
            totalEntries: 2,
            claudeRequests: 2,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
      useFilterStore.setState({ search: '', stepType: 'final_answer' })
      useSelectionStore.setState({ selectedRequestId: 'req-2' })
      useUiStore.setState({ leftPaneMode: 'requests', activeDetailTab: 'timeline' })
    })

    expect(screen.getByRole('heading', { name: 'Turn context' })).toBeInTheDocument()
    expect(screen.getByText('assistant called WebSearch')).toBeInTheDocument()
    expect(screen.getByText('assistant produced the final answer')).toBeInTheDocument()
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('updates step filters through the toolbar controls', async () => {
    const user = userEvent.setup()
    const requestOne = createRequest('req-1', 1, '/tool-call')
    const requestTwo = createRequest('req-2', 2, '/final-answer')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [requestOne, requestTwo],
          classified: [createClassification('req-1', 'tool_call'), createClassification('req-2', 'final_answer')],
          turns: createTurns([{ requestId: 'req-1', stepType: 'tool_call', summary: 'assistant emitted tool_use content' }]),
          diffs: [createDiff('req-1', 'Tool call row'), createDiff('req-2', 'Final answer row')],
          stats: {
            totalEntries: 2,
            claudeRequests: 2,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
    })

    await user.selectOptions(screen.getByLabelText('Filter by step type'), 'final_answer')

    expect(useFilterStore.getState().stepType).toBe('final_answer')
    expect(screen.getAllByText('Final answer row').length).toBeGreaterThan(0)
    expect(screen.queryByText('Tool call row')).not.toBeInTheDocument()
  })

  it('maps toolbar pane toggles to ui store modes', async () => {
    const user = userEvent.setup()
    const request = createRequest('req-1', 1, '/toggle')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [request],
          classified: [createClassification('req-1', 'tool_call')],
          turns: createTurns([{ requestId: 'req-1', stepType: 'tool_call', summary: 'assistant emitted tool_use content' }]),
          diffs: [createDiff('req-1', 'Toggle row')],
          stats: {
            totalEntries: 1,
            claudeRequests: 1,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
    })

    await user.click(screen.getByRole('button', { name: 'timeline' }))
    expect(useUiStore.getState().leftPaneMode).toBe('timeline')
    expect(screen.getByRole('button', { name: /turn-1.*tool_call.*assistant emitted tool_use content/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Time' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'network' }))
    expect(useUiStore.getState().leftPaneMode).toBe('requests')
    expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /turn-1.*tool_call.*assistant emitted tool_use content/i })).not.toBeInTheDocument()
  })

  it('changes the selected request in detail panel when a timeline node is clicked', async () => {
    const user = userEvent.setup()
    const requestOne = createRequest('req-1', 1, '/tool-call')
    const requestTwo = createRequest('req-2', 2, '/final-answer')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [requestOne, requestTwo],
          classified: [createClassification('req-1', 'tool_call'), createClassification('req-2', 'final_answer')],
          turns: createTurns([
            { requestId: 'req-1', stepType: 'planning', summary: 'assistant planned the next action', toolNames: [] },
            { requestId: 'req-1', stepType: 'tool_call', summary: 'assistant called WebSearch' },
            { requestId: 'req-2', stepType: 'final_answer', summary: 'assistant delivered the final answer', toolNames: [] },
          ]),
          diffs: [createDiff('req-1', 'Tool call row'), createDiff('req-2', 'Final answer row')],
          stats: {
            totalEntries: 2,
            claudeRequests: 2,
            toolCalls: 1,
          },
        },
        loading: false,
        error: null,
      })
      useSelectionStore.setState({ selectedRequestId: 'req-1' })
      useUiStore.setState({ leftPaneMode: 'timeline', activeDetailTab: 'summary' })
    })

    expect(screen.getByRole('heading', { name: 'Request #1' })).toBeInTheDocument()
    expect(screen.getByText('tool_call · /tool-call')).toBeInTheDocument()
    expect(screen.queryByText('final_answer · /final-answer')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /turn-1.*final_answer.*assistant delivered the final answer/i }))

    expect(useSelectionStore.getState().selectedRequestId).toBe('req-2')
    expect(screen.getByRole('heading', { name: 'Request #2' })).toBeInTheDocument()
    expect(screen.getByText('final_answer · /final-answer')).toBeInTheDocument()
    expect(screen.queryByText('tool_call · /tool-call')).not.toBeInTheDocument()
  })

  it('keeps requests visible when classification data is missing and no filters are applied', () => {
    const request = createRequest('req-1', 1, '/missing-classification')

    render(<HomePage />)

    act(() => {
      useSessionStore.setState({
        session: {
          requests: [request],
          classified: [],
          turns: createTurns([{ requestId: 'req-1', stepType: 'tool_call', summary: 'assistant emitted tool_use content' }]),
          diffs: [createDiff('req-1', 'Visible without classification')],
          stats: {
            totalEntries: 1,
            claudeRequests: 1,
            toolCalls: 0,
          },
        },
        loading: false,
        error: null,
      })
    })

    expect(screen.getAllByText('Visible without classification').length).toBeGreaterThan(0)
    expect(screen.getAllByText('unknown').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Request #1').length).toBeGreaterThan(0)
  })
})
