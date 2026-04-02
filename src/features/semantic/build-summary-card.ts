import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type {
  ClassifiedRequest,
  RequestDiffSummary,
  RequestSummaryCardVM,
} from '@/lib/models/semantic'

export function buildRequestSummaryCardVM(
  request: NormalizedClaudeRequest,
  classified: ClassifiedRequest,
  diff: RequestDiffSummary,
): RequestSummaryCardVM {
  const toolBadges = Array.from(new Set(classified.toolCalls.map((tool) => tool.name)))

  return {
    title: `Request #${request.index}`,
    subtitle: `${classified.stepType} · ${request.pathname}`,
    stepType: classified.stepType,
    confidence: classified.confidence,
    toolBadges,
    stopReason: request.reconstructedMessage?.stopReason,
    diffHighlights: diff.summaryLines,
    semanticReasons: classified.reasons,
  }
}
