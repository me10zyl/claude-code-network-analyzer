import { extractClaudeEntries, parseHarText } from '@/features/parsing/parse-har'

describe('parseHarText and extractClaudeEntries', () => {
  it('normalizes Anthropic POST /v1/messages entries for downstream consumers', () => {
    const requestBodyText = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello from test' }],
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
            required: ['query'],
          },
        },
      ],
    })

    const harText = JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'test', version: '1.0.0' },
        entries: [
          {
            startedDateTime: '2026-04-01T09:59:59.000Z',
            time: 10,
            request: {
              method: 'POST',
              url: 'not a valid url',
              headers: [],
            },
            response: {
              status: 400,
              statusText: 'Bad Request',
              headers: [],
              content: { size: 0, mimeType: 'text/plain', text: '' },
            },
          },
          {
            startedDateTime: '2026-04-01T10:00:00.000Z',
            time: 123,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [
                { name: 'content-type', value: 'application/json' },
                { name: 'x-request-id', value: 'req_123' },
              ],
              postData: {
                mimeType: 'application/json',
                text: requestBodyText,
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'content-type', value: 'text/event-stream' }],
              content: { size: 0, mimeType: 'text/event-stream', text: 'event: message_start' },
            },
          },
          {
            startedDateTime: '2026-04-01T10:00:01.000Z',
            time: 45,
            request: {
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: [],
            },
            response: {
              status: 202,
              statusText: 'Accepted',
              headers: [],
              content: { size: 0, mimeType: 'text/plain' },
            },
          },
          {
            startedDateTime: '2026-04-01T10:00:02.000Z',
            time: 45,
            request: {
              method: 'POST',
              url: 'http://api.anthropic.com/v1/messages',
              headers: [],
              postData: {
                mimeType: 'application/json',
                text: JSON.stringify({
                  messages: [{ role: 'user', content: [{ type: 'text', text: 'insecure' }] }],
                }),
              },
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: [],
              content: { size: 2, mimeType: 'text/plain', text: 'ok' },
            },
          },
        ],
      },
    })

    const har = parseHarText(harText)
    const entries = extractClaudeEntries(har)

    expect(entries).toHaveLength(2)

    expect(entries[0]).toMatchObject({
      index: 1,
      startedAt: Date.parse('2026-04-01T10:00:00.000Z'),
      pathname: '/v1/messages',
      rawRequestText: requestBodyText,
      rawResponseText: 'event: message_start',
    })
    expect(entries[0].body?.messages).toHaveLength(1)
    expect(entries[0].body?.tools?.[0]?.name).toBe('WebSearch')

    expect(entries[1]).toMatchObject({
      index: 2,
      startedAt: Date.parse('2026-04-01T10:00:01.000Z'),
      rawRequestText: '',
      rawResponseText: '',
      status: 202,
    })
  })

  it('returns null body when Anthropic request payload shape is invalid', () => {
    const har = parseHarText(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0.0' },
          entries: [
            {
              startedDateTime: '2026-04-01T10:00:03.000Z',
              time: 30,
              request: {
                method: 'POST',
                url: 'https://api.anthropic.com/v1/messages',
                headers: [],
                postData: {
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    model: 'claude-sonnet-4-5',
                    messages: [{ content: [{ type: 'text', text: 'missing role' }] }],
                  }),
                },
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [],
                content: { size: 0, mimeType: 'text/plain', text: '' },
              },
            },
          ],
        },
      }),
    )

    const [entry] = extractClaudeEntries(har)

    expect(entry.body).toBeNull()
  })

  it('keeps Claude request entry when request JSON is invalid and sets body to null', () => {
    const invalidRequestBodyText = '{"model":"claude-sonnet-4-5","messages":['
    const har = parseHarText(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0.0' },
          entries: [
            {
              startedDateTime: '2026-04-01T10:00:03.500Z',
              time: 30,
              request: {
                method: 'POST',
                url: 'https://api.anthropic.com/v1/messages',
                headers: [],
                postData: {
                  mimeType: 'application/json',
                  text: invalidRequestBodyText,
                },
              },
              response: {
                status: 400,
                statusText: 'Bad Request',
                headers: [],
                content: { size: 0, mimeType: 'application/json', text: '{"error":"invalid json"}' },
              },
            },
          ],
        },
      }),
    )

    const [entry] = extractClaudeEntries(har)

    expect(entry.rawRequestText).toBe(invalidRequestBodyText)
    expect(entry.body).toBeNull()
  })

  it('extracts anthropic-compatible proxy endpoints that forward /v1/messages requests', () => {
    const requestBodyText = JSON.stringify({
      model: 'glm-5-turbo',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: '你好' }],
        },
      ],
    })

    const har = parseHarText(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0.0' },
          entries: [
            {
              startedDateTime: '2026-04-01T10:00:04.000Z',
              time: 31,
              request: {
                method: 'POST',
                url: 'https://open.bigmodel.cn/api/anthropic/v1/messages?beta=true',
                headers: [],
                postData: {
                  mimeType: 'application/json',
                  text: requestBodyText,
                },
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'content-type', value: 'text/event-stream' }],
                content: {
                  size: 0,
                  mimeType: 'text/event-stream',
                  text: 'event: message_start\ndata: {"type":"message_start"}',
                },
              },
            },
          ],
        },
      }),
    )

    const entries = extractClaudeEntries(har)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      index: 1,
      host: 'open.bigmodel.cn',
      pathname: '/api/anthropic/v1/messages',
      rawRequestText: requestBodyText,
    })
    expect(entries[0].body?.messages).toHaveLength(1)
  })

  it('extracts loopback HTTP proxy endpoints that forward /v1/messages requests', () => {
    const requestBodyText = JSON.stringify({
      model: 'gpt-5.4(medium)',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'local proxy' }],
        },
      ],
    })

    const har = parseHarText(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0.0' },
          entries: [
            {
              startedDateTime: '2026-04-01T10:00:04.500Z',
              time: 31,
              request: {
                method: 'POST',
                url: 'http://127.0.0.1:8317/v1/messages?beta=true',
                headers: [],
                postData: {
                  mimeType: 'application/json',
                  text: requestBodyText,
                },
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'content-type', value: 'text/event-stream' }],
                content: {
                  size: 0,
                  mimeType: 'text/event-stream',
                  text: 'event: message_start\ndata: {"type":"message_start"}',
                },
              },
            },
          ],
        },
      }),
    )

    const entries = extractClaudeEntries(har)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      index: 1,
      host: '127.0.0.1:8317',
      pathname: '/v1/messages',
      rawRequestText: requestBodyText,
    })
    expect(entries[0].body?.messages).toHaveLength(1)
  })

  it('skips entries whose startedDateTime is invalid', () => {
    const har = parseHarText(
      JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 'test', version: '1.0.0' },
          entries: [
            {
              startedDateTime: 'not-a-date',
              time: 30,
              request: {
                method: 'POST',
                url: 'https://api.anthropic.com/v1/messages',
                headers: [],
                postData: {
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    messages: [{ role: 'user', content: [{ type: 'text', text: 'bad date' }] }],
                  }),
                },
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [],
                content: { size: 0, mimeType: 'text/plain', text: '' },
              },
            },
            {
              startedDateTime: '2026-04-01T10:00:04.000Z',
              time: 31,
              request: {
                method: 'POST',
                url: 'https://api.anthropic.com/v1/messages',
                headers: [],
                postData: {
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    messages: [{ role: 'user', content: [{ type: 'text', text: 'good date' }] }],
                  }),
                },
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [],
                content: { size: 0, mimeType: 'text/plain', text: '' },
              },
            },
          ],
        },
      }),
    )

    const entries = extractClaudeEntries(har)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      index: 1,
      startedAt: Date.parse('2026-04-01T10:00:04.000Z'),
    })
  })
})
