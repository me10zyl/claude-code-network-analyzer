import { harSchema, type Har } from '@/lib/models/har'
import type { HarHeader } from '@/lib/models/har'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import { parseAnthropicRequestBody } from '@/features/parsing/parse-anthropic-request'

function headersToRecord(headers: HarHeader[]): Record<string, string> {
  return Object.fromEntries(headers.map((header) => [header.name, header.value]))
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '::1' || hostname === '[::1]' || hostname.startsWith('127.')
}

function isClaudeMessagesEndpoint(url: URL): boolean {
  if (!url.pathname.endsWith('/v1/messages')) {
    return false
  }

  if (url.protocol === 'https:') {
    return true
  }

  // Reqable and similar local proxies commonly expose Claude-compatible endpoints over loopback HTTP.
  return url.protocol === 'http:' && isLoopbackHostname(url.hostname)
}

export function parseHarText(text: string): Har {
  return harSchema.parse(JSON.parse(text))
}

export function extractClaudeEntries(har: Har): NormalizedClaudeRequest[] {
  return har.log.entries
    .flatMap((entry) => {
      const url = tryParseUrl(entry.request.url)
      if (!url) {
        return []
      }

      const startedAt = Date.parse(entry.startedDateTime)
      if (Number.isNaN(startedAt)) {
        return []
      }

      return [{ entry, url, startedAt }]
    })
    .filter(({ entry, url }) => {
      return isClaudeMessagesEndpoint(url) && entry.request.method.toUpperCase() === 'POST'
    })
    .map(({ entry, url, startedAt }, index) => {
      const rawRequestText = entry.request.postData?.text ?? ''
      const rawResponseText = entry.response.content.text ?? ''

      return {
        id: `${index + 1}-${entry.startedDateTime}`,
        index: index + 1,
        startedAt,
        durationMs: entry.time,
        host: url.host,
        pathname: url.pathname,
        method: entry.request.method,
        status: entry.response.status,
        requestHeaders: headersToRecord(entry.request.headers),
        responseHeaders: headersToRecord(entry.response.headers),
        body: parseAnthropicRequestBody(rawRequestText),
        rawRequestText,
        rawResponseText,
      }
    })
}
