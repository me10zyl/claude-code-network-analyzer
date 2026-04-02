import { buildConversationTimeline } from '@/features/semantic/build-timeline'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest } from '@/lib/models/semantic'

function createRequest(id: string, startedAt: number, index: number): NormalizedClaudeRequest {
  return {
    id,
    index,
    startedAt,
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
  }
}

function createClassifiedRequest(
  requestId: string,
  stepType: ClassifiedRequest['stepType'],
): ClassifiedRequest {
  return {
    requestId,
    stepType,
    confidence: 0.9,
    reasons: [`${stepType} reason`],
    toolCalls: stepType === 'tool_call' ? [{ name: 'WebSearch' }] : [],
    hasToolResult: false,
    hasThinking: stepType === 'planning',
  }
}

describe('buildConversationTimeline', () => {
  it('builds one turn with planning, tool_call, and final_answer in order', () => {
    const requests = [
      createRequest('req-1', 10, 1),
      createRequest('req-2', 20, 2),
      createRequest('req-3', 30, 3),
    ]
    const classified = [
      createClassifiedRequest('req-1', 'planning'),
      createClassifiedRequest('req-2', 'tool_call'),
      createClassifiedRequest('req-3', 'final_answer'),
    ]

    const timeline = buildConversationTimeline(requests, classified)

    expect(timeline).toHaveLength(1)
    expect(timeline[0].steps.map((step) => step.type)).toEqual([
      'planning',
      'tool_call',
      'final_answer',
    ])
  })
})
