export type AnthropicMessagesRequest = {
  model?: string
  max_tokens?: number
  thinking?: unknown
  messages: Array<{
    role: string
    content: unknown
  }>
  tools?: Array<{
    name: string
    description?: string
    input_schema?: unknown
  }>
}

export type AnthropicSseEvent = {
  seq: number
  event: string | null
  data: unknown
  rawData: string
}

export type ReconstructedContentBlock =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'tool_use'
      id: string
      name: string
      input: unknown
      inputText: string
    }

export type ReconstructedAssistantMessage = {
  content: ReconstructedContentBlock[]
  stopReason: string | null
  usage?: {
    output_tokens?: number
  }
}

export type NormalizedClaudeRequest = {
  id: string
  index: number
  startedAt: number
  durationMs: number
  host: string
  pathname: string
  method: string
  status: number
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  body: AnthropicMessagesRequest | null
  rawRequestText: string
  rawResponseText: string
  sseEvents?: AnthropicSseEvent[]
  reconstructedMessage?: ReconstructedAssistantMessage | null
}
