import type {
  AnthropicSseEvent,
  ReconstructedAssistantMessage,
  ReconstructedContentBlock,
} from '@/lib/models/normalized'

type TextBlockState = {
  type: 'text'
  text: string
}

type ToolUseBlockState = {
  type: 'tool_use'
  id: string
  name: string
  inputText: string
  hasDelta: boolean
}

type ContentBlockState = TextBlockState | ToolUseBlockState

type EventPayload = {
  type?: string
  index?: number
  usage?: {
    output_tokens?: number
  }
  delta?: Record<string, unknown>
  message?: {
    stop_reason?: string | null
    usage?: {
      output_tokens?: number
    }
  }
  content_block?: {
    type?: string
    text?: string
    id?: string
    name?: string
    input?: unknown
  }
}

function parseJsonIfValid(text: string): unknown {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function reconstructAssistantMessage(
  events: AnthropicSseEvent[],
): ReconstructedAssistantMessage | null {
  if (events.length === 0) {
    return null
  }

  const blocks = new Map<number, ContentBlockState>()
  let stopReason: string | null = null
  let usage: ReconstructedAssistantMessage['usage']

  for (const event of events) {
    if (!event.data || typeof event.data !== 'object') {
      continue
    }

    const payload = event.data as EventPayload

    if (payload.type === 'message_start') {
      stopReason = payload.message?.stop_reason ?? stopReason
      usage = payload.message?.usage ?? usage
      continue
    }

    if (payload.type === 'content_block_start' && typeof payload.index === 'number') {
      if (payload.content_block?.type === 'text') {
        blocks.set(payload.index, {
          type: 'text',
          text: payload.content_block.text ?? '',
        })
      }

      if (payload.content_block?.type === 'tool_use') {
        const initialInput = payload.content_block.input
        blocks.set(payload.index, {
          type: 'tool_use',
          id: payload.content_block.id ?? '',
          name: payload.content_block.name ?? '',
          inputText:
            initialInput === undefined ? '' : JSON.stringify(initialInput),
          hasDelta: false,
        })
      }

      continue
    }

    if (payload.type === 'content_block_delta' && typeof payload.index === 'number') {
      const block = blocks.get(payload.index)
      if (!block) {
        continue
      }

      if (block.type === 'text' && payload.delta?.type === 'text_delta') {
        block.text += typeof payload.delta.text === 'string' ? payload.delta.text : ''
      }

      if (block.type === 'tool_use' && payload.delta?.type === 'input_json_delta') {
        const partialJson =
          typeof payload.delta.partial_json === 'string' ? payload.delta.partial_json : ''

        block.inputText = block.hasDelta ? block.inputText + partialJson : partialJson
        block.hasDelta = true
      }

      continue
    }

    if (payload.type === 'message_delta') {
      stopReason =
        typeof payload.delta?.stop_reason === 'string' || payload.delta?.stop_reason === null
          ? (payload.delta.stop_reason as string | null)
          : stopReason
      usage = payload.usage ?? usage
    }
  }

  const content = [...blocks.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, block]): ReconstructedContentBlock => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: block.text,
        }
      }

      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: parseJsonIfValid(block.inputText),
        inputText: block.inputText,
      }
    })

  return {
    content,
    stopReason,
    usage,
  }
}
