import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { RequestDiffSummary } from '@/lib/models/semantic'

function countToolResultBlocks(messages: unknown[] | undefined): number {
  return JSON.stringify(messages ?? []).split('tool_result').length - 1
}

export function diffClaudeRequests(
  prev: NormalizedClaudeRequest | undefined,
  current: NormalizedClaudeRequest,
): { summary: RequestDiffSummary } {
  if (!prev) {
    return {
      summary: {
        changed: false,
        systemChanged: false,
        toolsChanged: false,
        messagesChanged: false,
        toolResultsAdded: 0,
        assistantOutputChanged: false,
        summaryLines: ['No previous comparable request.'],
      },
    }
  }

  const prevSystem = JSON.stringify((prev.body as { system?: unknown } | null)?.system ?? null)
  const currentSystem = JSON.stringify((current.body as { system?: unknown } | null)?.system ?? null)
  const prevTools = JSON.stringify(prev.body?.tools ?? [])
  const currentTools = JSON.stringify(current.body?.tools ?? [])
  const prevMessages = JSON.stringify(prev.body?.messages ?? [])
  const currentMessages = JSON.stringify(current.body?.messages ?? [])
  const prevOutput = JSON.stringify(prev.reconstructedMessage?.content ?? [])
  const currentOutput = JSON.stringify(current.reconstructedMessage?.content ?? [])
  const toolResultsAdded = Math.max(
    countToolResultBlocks(current.body?.messages) - countToolResultBlocks(prev.body?.messages),
    0,
  )

  const summaryLines: string[] = []
  if (prevTools !== currentTools) {
    summaryLines.push('Tool definitions changed.')
  }
  if (toolResultsAdded > 0) {
    summaryLines.push(`Added ${toolResultsAdded} tool result block.`)
  }
  if (prevOutput !== currentOutput) {
    summaryLines.push('Assistant output changed.')
  }
  if (summaryLines.length === 0) {
    summaryLines.push('No meaningful change detected.')
  }

  return {
    summary: {
      changed: summaryLines[0] !== 'No meaningful change detected.',
      systemChanged: prevSystem !== currentSystem,
      toolsChanged: prevTools !== currentTools,
      messagesChanged: prevMessages !== currentMessages,
      toolResultsAdded,
      assistantOutputChanged: prevOutput !== currentOutput,
      summaryLines,
    },
  }
}
