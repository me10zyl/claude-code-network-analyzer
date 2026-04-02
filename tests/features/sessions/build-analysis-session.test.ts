import { buildAnalysisSession } from '@/features/sessions/build-analysis-session'

describe('buildAnalysisSession', () => {
  it('builds one tool-call turn from a Claude request with thinking enabled', () => {
    const harText = JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'test', version: '1.0.0' },
        entries: [
          {
            startedDateTime: '2026-04-01T10:00:00.000Z',
            time: 123,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  thinking: { type: 'enabled', budget_tokens: 1024 },
                  messages: [
                    {
                      role: 'user',
                      content: [{ type: 'text', text: 'Search for network analyzer docs' }],
                    },
                  ],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: {
                size: 0,
                mimeType: 'text/event-stream',
                text: [
                  'event: message_start',
                  'data: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","content":[],"stop_reason":null,"usage":{"output_tokens":1}}}',
                  '',
                  'event: content_block_start',
                  'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"WebSearch","input":{}}}',
                  '',
                  'event: content_block_delta',
                  'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"network analyzer docs\\"}"}}',
                  '',
                  'event: message_delta',
                  'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":7}}',
                  '',
                  'event: message_stop',
                  'data: {"type":"message_stop"}',
                ].join('\n'),
              },
            },
          },
        ],
      },
    })

    const session = buildAnalysisSession(harText)

    expect(session.requests).toHaveLength(1)
    expect(session.classified[0].stepType).toBe('tool_call')
    expect(session.classified[0].toolCalls).toEqual([{ id: 'toolu_1', name: 'WebSearch' }])
    expect(session.turns).toHaveLength(1)
    expect(session.turns[0]).toMatchObject({
      id: 'turn-1',
      steps: [
        {
          requestId: session.requests[0].id,
          type: 'tool_call',
          toolNames: ['WebSearch'],
          summary: 'assistant emitted tool_use content',
        },
      ],
    })
    expect(session.diffs).toEqual([
      {
        requestId: session.requests[0].id,
        summary: {
          changed: false,
          systemChanged: false,
          toolsChanged: false,
          messagesChanged: false,
          toolResultsAdded: 0,
          assistantOutputChanged: false,
          summaryLines: ['No previous comparable request.'],
        },
      },
    ])
    expect(session.stats).toEqual({
      totalEntries: 1,
      claudeRequests: 1,
      toolCalls: 1,
    })
  })

  it('captures diffs, stats, and final-answer turn boundaries across consecutive requests', () => {
    const harText = JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'test', version: '1.0.0' },
        entries: [
          {
            startedDateTime: '2026-04-01T10:00:00.000Z',
            time: 123,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  tools: [{ name: 'WebSearch', input_schema: { type: 'object' } }],
                  messages: [
                    {
                      role: 'user',
                      content: [{ type: 'text', text: 'Search for network analyzer docs' }],
                    },
                  ],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: {
                size: 0,
                mimeType: 'text/event-stream',
                text: [
                  'event: message_start',
                  'data: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","content":[],"stop_reason":null,"usage":{"output_tokens":1}}}',
                  '',
                  'event: content_block_start',
                  'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"WebSearch","input":{}}}',
                  '',
                  'event: content_block_delta',
                  'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"query\\":\\"network analyzer docs\\"}"}}',
                  '',
                  'event: message_delta',
                  'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":7}}',
                  '',
                  'event: message_stop',
                  'data: {"type":"message_stop"}',
                ].join('\n'),
              },
            },
          },
          {
            startedDateTime: '2026-04-01T10:00:01.000Z',
            time: 124,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  tools: [
                    { name: 'WebSearch', input_schema: { type: 'object' } },
                    { name: 'Read', input_schema: { type: 'object' } },
                  ],
                  messages: [
                    {
                      role: 'user',
                      content: [{ type: 'text', text: 'Search for network analyzer docs' }],
                    },
                    {
                      role: 'assistant',
                      content: [{ type: 'tool_use', id: 'toolu_1', name: 'WebSearch', input: { query: 'network analyzer docs' } }],
                    },
                    {
                      role: 'user',
                      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Found docs.' }],
                    },
                  ],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: {
                size: 0,
                mimeType: 'text/event-stream',
                text: [
                  'event: message_start',
                  'data: {"type":"message_start","message":{"id":"msg_2","type":"message","role":"assistant","content":[],"stop_reason":null,"usage":{"output_tokens":1}}}',
                  '',
                  'event: content_block_start',
                  'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Observed the search results and prepared the reply."}}',
                  '',
                  'event: message_delta',
                  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":9}}',
                  '',
                  'event: message_stop',
                  'data: {"type":"message_stop"}',
                ].join('\n'),
              },
            },
          },
          {
            startedDateTime: '2026-04-01T10:00:02.000Z',
            time: 125,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  tools: [
                    { name: 'WebSearch', input_schema: { type: 'object' } },
                    { name: 'Read', input_schema: { type: 'object' } },
                  ],
                  messages: [
                    {
                      role: 'user',
                      content: [{ type: 'text', text: 'Give me the final summary only.' }],
                    },
                    {
                      role: 'assistant',
                      content: [{ type: 'text', text: 'Observed the search results and prepared the reply.' }],
                    },
                  ],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: {
                size: 0,
                mimeType: 'text/event-stream',
                text: [
                  'event: message_start',
                  'data: {"type":"message_start","message":{"id":"msg_3","type":"message","role":"assistant","content":[],"stop_reason":null,"usage":{"output_tokens":1}}}',
                  '',
                  'event: content_block_start',
                  'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Here is the final answer."}}',
                  '',
                  'event: message_delta',
                  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}',
                  '',
                  'event: message_stop',
                  'data: {"type":"message_stop"}',
                ].join('\n'),
              },
            },
          },
        ],
      },
    })

    const session = buildAnalysisSession(harText)

    expect(session.requests).toHaveLength(3)
    expect(session.classified.map((item) => item.stepType)).toEqual([
      'tool_call',
      'observation',
      'final_answer',
    ])
    expect(session.classified[1]).toMatchObject({
      hasToolResult: true,
      toolCalls: [],
      reasons: ['request messages include tool_result blocks', 'message history grew from previous request'],
    })
    expect(session.diffs[1]).toEqual({
      requestId: session.requests[1].id,
      summary: {
        changed: true,
        systemChanged: false,
        toolsChanged: true,
        messagesChanged: true,
        toolResultsAdded: 1,
        assistantOutputChanged: true,
        summaryLines: [
          'Tool definitions changed.',
          'Added 1 tool result block.',
          'Assistant output changed.',
        ],
      },
    })
    expect(session.diffs[2]).toEqual({
      requestId: session.requests[2].id,
      summary: {
        changed: true,
        systemChanged: false,
        toolsChanged: false,
        messagesChanged: true,
        toolResultsAdded: 0,
        assistantOutputChanged: true,
        summaryLines: ['Assistant output changed.'],
      },
    })
    expect(session.turns).toHaveLength(1)
    expect(session.turns[0]).toMatchObject({
      startedAt: session.requests[0].startedAt,
      endedAt: session.requests[2].startedAt,
      steps: [
        { requestId: session.requests[0].id, type: 'tool_call' },
        { requestId: session.requests[1].id, type: 'observation' },
        { requestId: session.requests[2].id, type: 'final_answer' },
      ],
    })
    expect(session.stats).toEqual({
      totalEntries: 3,
      claudeRequests: 3,
      toolCalls: 1,
    })
  })

  it('skips SSE parsing for empty responses and only reconstructs when SSE events exist', () => {
    const harText = JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'test', version: '1.0.0' },
        entries: [
          {
            startedDateTime: '2026-04-01T10:05:00.000Z',
            time: 50,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  messages: [{ role: 'user', content: [{ type: 'text', text: 'empty response' }] }],
                }),
              },
            },
            response: {
              status: 202,
              statusText: 'Accepted',
              headers: [],
              content: { size: 0, mimeType: 'text/plain', text: '' },
            },
          },
          {
            startedDateTime: '2026-04-01T10:05:01.000Z',
            time: 51,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  messages: [{ role: 'user', content: [{ type: 'text', text: 'whitespace response' }] }],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: {
                size: 3,
                mimeType: 'text/event-stream',
                text: '   ',
              },
            },
          },
          {
            startedDateTime: '2026-04-01T10:05:02.000Z',
            time: 52,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [{ name: 'content-type', value: 'application/json' }],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  model: 'claude-sonnet-4-5',
                  messages: [{ role: 'user', content: [{ type: 'text', text: 'malformed sse' }] }],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: {
                size: 0,
                mimeType: 'text/event-stream',
                text: 'event: ping\ndata: not-json',
              },
            },
          },
        ],
      },
    })

    const session = buildAnalysisSession(harText)

    expect(session.requests).toHaveLength(3)
    expect(session.requests[0].sseEvents).toEqual([])
    expect(session.requests[0].reconstructedMessage).toBeNull()
    expect(session.requests[1].sseEvents).toEqual([])
    expect(session.requests[1].reconstructedMessage).toBeNull()
    expect(session.requests[2].sseEvents).toEqual([
      {
        seq: 0,
        event: 'ping',
        data: 'not-json',
        rawData: 'not-json',
      },
    ])
    expect(session.requests[2].reconstructedMessage).toEqual({
      content: [],
      stopReason: null,
      usage: undefined,
    })
  })
})
