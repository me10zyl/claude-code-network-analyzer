import { diffClaudeRequests } from '@/features/diff/diff-requests'
import { parseAnthropicSse } from '@/features/parsing/parse-anthropic-sse'
import { extractClaudeEntries, parseHarText } from '@/features/parsing/parse-har'
import { reconstructAssistantMessage } from '@/features/parsing/reconstruct-message'
import { buildConversationTimeline } from '@/features/semantic/build-timeline'
import { classifyClaudeRequest } from '@/features/semantic/classify-step'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, ConversationTurn, RequestDiffSummary } from '@/lib/models/semantic'

export interface AnalysisSession {
  requests: NormalizedClaudeRequest[]
  classified: ClassifiedRequest[]
  turns: ConversationTurn[]
  diffs: Array<{ requestId: string; summary: RequestDiffSummary }>
  stats: {
    totalEntries: number
    claudeRequests: number
    toolCalls: number
  }
}

export function buildAnalysisSession(harText: string): AnalysisSession {
  const har = parseHarText(harText)
  const requests = extractClaudeEntries(har).map((request) => {
    const rawResponseText = request.rawResponseText.trim()
    const sseEvents = rawResponseText ? parseAnthropicSse(rawResponseText) : []
    const reconstructedMessage = sseEvents.length > 0 ? reconstructAssistantMessage(sseEvents) : null

    return {
      ...request,
      sseEvents,
      reconstructedMessage,
    }
  })

  const classified = requests.map((request, index) =>
    classifyClaudeRequest(request, requests[index - 1]),
  )
  const turns = buildConversationTimeline(requests, classified)
  const diffs = requests.map((request, index) => ({
    requestId: request.id,
    summary: diffClaudeRequests(requests[index - 1], request).summary,
  }))

  return {
    requests,
    classified,
    turns,
    diffs,
    stats: {
      totalEntries: har.log.entries.length,
      claudeRequests: requests.length,
      toolCalls: classified.reduce((count, item) => count + item.toolCalls.length, 0),
    },
  }
}
