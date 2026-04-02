import type { ConversationTurn } from '@/lib/models/semantic'

import { TimelineNode } from '@/components/timeline/timeline-node'

interface TimelineViewProps {
  turns: ConversationTurn[]
  selectedRequestId: string | null
  onSelectRequest: (requestId: string) => void
}

export function TimelineView({ turns, selectedRequestId, onSelectRequest }: TimelineViewProps) {
  if (!turns.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-sm text-slate-500">
        No timeline data available.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {turns.map((turn) => (
        <section key={turn.id} className="space-y-3">
          <div className="px-1 text-xs uppercase tracking-wide text-slate-500">{turn.id}</div>
          {turn.steps.map((step) => (
            <TimelineNode
              key={step.id}
              turn={turn}
              step={step}
              selected={selectedRequestId === step.requestId}
              onSelectRequest={onSelectRequest}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
