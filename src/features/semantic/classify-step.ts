import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest } from '@/lib/models/semantic'

function hasToolResultInMessages(messages: unknown[] | undefined): boolean {
  return JSON.stringify(messages ?? []).includes('tool_result')
}

export function classifyClaudeRequest(
  current: NormalizedClaudeRequest,
  prev?: NormalizedClaudeRequest,
): ClassifiedRequest {
  const toolCalls =
    current.reconstructedMessage?.content
      .filter((block) => block.type === 'tool_use')
      .map((block) => ({ id: block.id, name: block.name })) ?? []
  const hasToolResult = hasToolResultInMessages(current.body?.messages)
  const hasThinking = Boolean((current.body as { thinking?: unknown } | null)?.thinking)
  const reasons: string[] = []

  let stepType: ClassifiedRequest['stepType'] = 'unknown'
  let confidence = 0.45

  if (toolCalls.length > 0 || current.reconstructedMessage?.stopReason === 'tool_use') {
    stepType = 'tool_call'
    confidence = 0.99
    reasons.push('assistant emitted tool_use content')
  } else if (hasToolResult) {
    stepType = 'observation'
    confidence = 0.9
    reasons.push('request messages include tool_result blocks')
  } else if (hasThinking) {
    stepType = 'planning'
    confidence = 0.88
    reasons.push('thinking config is enabled')
  } else if (
    current.reconstructedMessage?.content.length &&
    current.reconstructedMessage.content.every((block) => block.type === 'text')
  ) {
    stepType = 'final_answer'
    confidence = 0.84
    reasons.push('assistant response is text-only')
  }

  if (
    prev?.body?.messages &&
    current.body?.messages &&
    current.body.messages.length > prev.body.messages.length
  ) {
    reasons.push('message history grew from previous request')
  }

  return {
    requestId: current.id,
    stepType,
    confidence,
    reasons,
    toolCalls,
    hasToolResult,
    hasThinking,
  }
}
