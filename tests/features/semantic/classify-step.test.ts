import { classifyClaudeRequest } from '@/features/semantic/classify-step'
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
    },
    rawRequestText: '{}',
    rawResponseText: '',
    ...overrides,
  }
}

describe('classifyClaudeRequest', () => {
  it('classifies tool_use output as a tool_call with high confidence', () => {
    const request = createRequest({
      reconstructedMessage: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'WebSearch',
            input: { query: 'network traces' },
            inputText: '{"query":"network traces"}',
          },
        ],
        stopReason: 'tool_use',
      },
    })

    const result = classifyClaudeRequest(request)

    expect(result.stepType).toBe('tool_call')
    expect(result.confidence).toBeGreaterThan(0.8)
    expect(result.toolCalls).toEqual([{ id: 'toolu_1', name: 'WebSearch' }])
  })
})
