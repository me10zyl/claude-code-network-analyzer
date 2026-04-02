import type {
  ClassifiedRequest,
  ConversationTurn,
  TimelineStep,
} from '@/lib/models/semantic'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'

export function buildConversationTimeline(
  requests: NormalizedClaudeRequest[],
  classified: ClassifiedRequest[],
): ConversationTurn[] {
  const classifiedById = new Map(classified.map((item) => [item.requestId, item]))
  const turns: ConversationTurn[] = []
  let currentTurn: ConversationTurn | null = null

  for (const request of [...requests].sort((left, right) => left.startedAt - right.startedAt)) {
    const currentClassification = classifiedById.get(request.id)
    if (!currentClassification) {
      continue
    }

    if (!currentTurn) {
      currentTurn = {
        id: `turn-${turns.length + 1}`,
        startedAt: request.startedAt,
        steps: [],
      }
      turns.push(currentTurn)
    }

    const step: TimelineStep = {
      id: `step-${request.id}`,
      requestId: request.id,
      type: currentClassification.stepType,
      title: currentClassification.stepType.replace('_', ' '),
      summary: currentClassification.reasons[0] ?? 'Derived from request data',
      toolNames: currentClassification.toolCalls.map((tool) => tool.name),
      startedAt: request.startedAt,
    }

    currentTurn.steps.push(step)

    if (currentClassification.stepType === 'final_answer') {
      currentTurn.endedAt = request.startedAt
      currentTurn = null
    }
  }

  return turns
}
