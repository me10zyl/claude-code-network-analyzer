import type { AnthropicSseEvent } from '@/lib/models/normalized'

function tryParseJson(rawData: string): unknown {
  try {
    return JSON.parse(rawData)
  } catch {
    return rawData
  }
}

export function parseAnthropicSse(raw: string): AnthropicSseEvent[] {
  if (!raw.trim()) {
    return []
  }

  return raw
    .split(/\r?\n\r?\n+/)
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame, index) => {
      const lines = frame.split(/\r?\n/)
      const eventLine = lines.find((line) => line.startsWith('event:'))
      const dataLines = lines.filter((line) => line.startsWith('data:'))
      const rawData = dataLines.map((line) => line.slice(5).trimStart()).join('\n')

      return {
        seq: index,
        event: eventLine ? eventLine.slice(6).trim() : null,
        data: tryParseJson(rawData),
        rawData,
      }
    })
}
