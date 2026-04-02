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
  return {
    title: `Request #${request.index}`,
    subtitle: `${classified.stepType} · ${request.pathname}`,
    stepType: classified.stepType,
    confidence: classified.confidence,
    toolBadges: classified.toolCalls.map((tool) => tool.name),
    stopReason: request.reconstructedMessage?.stopReason,
    diffHighlights: diff.summaryLines,
    semanticReasons: classified.reasons,
  }
}
