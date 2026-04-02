import { buildRequestSummaryCardVM } from '@/features/semantic/build-summary-card'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, RequestDiffSummary } from '@/lib/models/semantic'
import { describe, expect, it } from 'vitest'

describe('buildRequestSummaryCardVM', () => {
  it('deduplicates repeated tool badges with the same name', () => {
    const request: NormalizedClaudeRequest = {
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
      body: null,
      rawRequestText: '{}',
      rawResponseText: '{}',
      reconstructedMessage: null,
    }

    const classified: ClassifiedRequest = {
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

    const diff: RequestDiffSummary = {
      changed: true,
      systemChanged: false,
      toolsChanged: true,
      messagesChanged: false,
      toolResultsAdded: 0,
      assistantOutputChanged: false,
      summaryLines: [],
    }

    expect(buildRequestSummaryCardVM(request, classified, diff).toolBadges).toEqual(['Agent'])
  })
})
