import { diffClaudeRequests } from '@/features/diff/diff-requests'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'

function createRequest(overrides: Partial<NormalizedClaudeRequest> = {}): NormalizedClaudeRequest {
  return {
    id: 'req-1',
    index: 1,
    startedAt: 1,
    durationMs: 100,
    host: 'api.anthropic.com',
    pathname: '/v1/messages',
    method: 'POST',
    status: 200,
    requestHeaders: {},
    responseHeaders: {},
    body: {
      messages: [],
      tools: [],
    },
    rawRequestText: '{}',
    rawResponseText: '',
    ...overrides,
  }
}

describe('diffClaudeRequests', () => {
  it('reports tool changes and added tool results in the summary', () => {
    const previous = createRequest({
      id: 'req-1',
      body: {
        messages: [{ role: 'user', content: 'hello' }],
        tools: [],
      },
    })
    const current = createRequest({
      id: 'req-2',
      body: {
        messages: [
          { role: 'user', content: 'hello' },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] },
        ],
        tools: [{ name: 'WebSearch', description: 'Search the web' }],
      },
    })

    const result = diffClaudeRequests(previous, current)

    expect(result.summary.toolsChanged).toBe(true)
    expect(result.summary.toolResultsAdded).toBe(1)
    expect(result.summary.summaryLines).toContain('Added 1 tool result block.')
  })
})
