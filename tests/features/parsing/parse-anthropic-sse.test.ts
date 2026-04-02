import { parseAnthropicSse } from '@/features/parsing/parse-anthropic-sse'
import { reconstructAssistantMessage } from '@/features/parsing/reconstruct-message'

describe('parseAnthropicSse and reconstructAssistantMessage', () => {
  it('parses Anthropic SSE frames and reconstructs assistant text and tool_use blocks', () => {
    const frames = [
      {
        event: 'message_start',
        data: {
          type: 'message_start',
          message: {
            id: 'msg_1',
            type: 'message',
            role: 'assistant',
            content: [],
            stop_reason: null,
            usage: { output_tokens: 1 },
          },
        },
      },
      {
        event: 'content_block_start',
        data: {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        },
      },
      {
        event: 'content_block_delta',
        data: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Planning...' },
        },
      },
      {
        event: 'content_block_stop',
        data: { type: 'content_block_stop', index: 0 },
      },
      {
        event: 'content_block_start',
        data: {
          type: 'content_block_start',
          index: 1,
          content_block: { type: 'tool_use', id: 'toolu_1', name: 'WebSearch', input: {} },
        },
      },
      {
        event: 'content_block_delta',
        data: {
          type: 'content_block_delta',
          index: 1,
          delta: {
            type: 'input_json_delta',
            partial_json: '{"query":"claude code"}',
          },
        },
      },
      {
        event: 'message_delta',
        data: {
          type: 'message_delta',
          delta: { stop_reason: 'tool_use' },
          usage: { output_tokens: 7 },
        },
      },
      {
        event: 'message_stop',
        data: { type: 'message_stop' },
      },
    ]

    const rawSse = frames
      .map((frame) => `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}`)
      .join('\n\n')

    const events = parseAnthropicSse(rawSse)
    const reconstructed = reconstructAssistantMessage(events)

    expect(events).toHaveLength(8)

    expect(reconstructed?.content[0]).toEqual({
      type: 'text',
      text: 'Planning...',
    })
    expect(reconstructed?.content[1]).toEqual({
      type: 'tool_use',
      id: 'toolu_1',
      name: 'WebSearch',
      input: { query: 'claude code' },
      inputText: '{"query":"claude code"}',
    })
    expect(reconstructed?.stopReason).toBe('tool_use')
    expect(reconstructed?.usage?.output_tokens).toBe(7)
  })

  it('parses CRLF-separated SSE frames', () => {
    const rawSse = [
      'event: message_start\r\ndata: {"type":"message_start","message":{"stop_reason":null,"usage":{"output_tokens":1}}}',
      'event: content_block_start\r\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"hello"}}',
      'event: message_stop\r\ndata: {"type":"message_stop"}',
    ].join('\r\n\r\n')

    const events = parseAnthropicSse(rawSse)

    expect(events).toHaveLength(3)
    expect(events[0]).toMatchObject({
      event: 'message_start',
      data: {
        type: 'message_start',
      },
    })
    expect(events[1]).toMatchObject({
      event: 'content_block_start',
      data: {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'text',
          text: 'hello',
        },
      },
    })
    expect(events[2]).toMatchObject({
      event: 'message_stop',
      data: {
        type: 'message_stop',
      },
    })
  })

  it('preserves initial tool_use input when no input_json_delta arrives', () => {
    const frames = [
      {
        event: 'message_start',
        data: {
          type: 'message_start',
          message: {
            stop_reason: null,
            usage: { output_tokens: 1 },
          },
        },
      },
      {
        event: 'content_block_start',
        data: {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'toolu_2',
            name: 'WebSearch',
            input: { query: 'preserved' },
          },
        },
      },
      {
        event: 'message_delta',
        data: {
          type: 'message_delta',
          delta: { stop_reason: 'tool_use' },
          usage: { output_tokens: 2 },
        },
      },
    ]

    const rawSse = frames
      .map((frame) => `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}`)
      .join('\n\n')

    const reconstructed = reconstructAssistantMessage(parseAnthropicSse(rawSse))

    expect(reconstructed?.content).toEqual([
      {
        type: 'tool_use',
        id: 'toolu_2',
        name: 'WebSearch',
        input: { query: 'preserved' },
        inputText: '{"query":"preserved"}',
      },
    ])
    expect(reconstructed?.stopReason).toBe('tool_use')
    expect(reconstructed?.usage?.output_tokens).toBe(2)
  })

  it('preserves raw tool input text when input_json_delta never forms valid JSON', () => {
    const frames = [
      {
        event: 'message_start',
        data: {
          type: 'message_start',
          message: {
            stop_reason: null,
            usage: { output_tokens: 1 },
          },
        },
      },
      {
        event: 'content_block_start',
        data: {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'toolu_3',
            name: 'WebSearch',
            input: {},
          },
        },
      },
      {
        event: 'content_block_delta',
        data: {
          type: 'content_block_delta',
          index: 0,
          delta: {
            type: 'input_json_delta',
            partial_json: '{"query":',
          },
        },
      },
      {
        event: 'content_block_delta',
        data: {
          type: 'content_block_delta',
          index: 0,
          delta: {
            type: 'input_json_delta',
            partial_json: 'oops',
          },
        },
      },
      {
        event: 'message_delta',
        data: {
          type: 'message_delta',
          delta: { stop_reason: 'tool_use' },
          usage: { output_tokens: 3 },
        },
      },
    ]

    const rawSse = frames
      .map((frame) => `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}`)
      .join('\n\n')

    const reconstructed = reconstructAssistantMessage(parseAnthropicSse(rawSse))

    expect(reconstructed?.content[0]).toEqual({
      type: 'tool_use',
      id: 'toolu_3',
      name: 'WebSearch',
      input: '{"query":oops',
      inputText: '{"query":oops',
    })
  })
})
