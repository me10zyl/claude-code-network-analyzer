import type { ConversationTurn } from '@/lib/models/semantic'

interface TimelineContextTabProps {
  requestId: string
  turns: ConversationTurn[]
}

export function TimelineContextTab({ requestId, turns }: TimelineContextTabProps) {
  const currentTurn = turns.find((turn) => turn.steps.some((step) => step.requestId === requestId))

  if (!currentTurn) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-500">
        No timeline context available for this request.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      <h3 className="text-sm font-medium text-slate-200">Turn context</h3>
      <p className="mt-1 text-sm text-slate-500">{currentTurn.id}</p>
      <ol className="mt-4 space-y-3">
        {currentTurn.steps.map((step, index) => {
          const isCurrent = step.requestId === requestId
          return (
            <li
              key={step.id}
              className={[
                'rounded-xl border px-3 py-3 text-sm',
                isCurrent ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-slate-800 bg-slate-950/70 text-slate-300',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Step {index + 1}</span>
                <span className="text-xs uppercase tracking-wide text-slate-500">{step.type}</span>
              </div>
              <div className="mt-2">{step.summary}</div>
              {step.toolNames.length ? <div className="mt-2 text-xs text-slate-400">Tools: {step.toolNames.join(', ')}</div> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
