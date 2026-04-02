import type { ConversationTurn, TimelineStep } from '@/lib/models/semantic'

interface TimelineNodeProps {
  turn: ConversationTurn
  step: TimelineStep
  selected?: boolean
  onSelectRequest?: (requestId: string) => void
}

export function TimelineNode({ turn, step, selected = false, onSelectRequest }: TimelineNodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectRequest?.(step.requestId)}
      className={[
        'w-full rounded-2xl border p-4 text-left transition-colors',
        selected
          ? 'border-sky-500/40 bg-sky-500/10'
          : 'border-slate-800 bg-slate-900/90 hover:bg-slate-800/60',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-100">{turn.id}</div>
          <div className="mt-1 text-xs text-slate-500">{step.title}</div>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">{step.type}</span>
      </div>
      <div className="mt-3 text-sm text-slate-200">{step.title}</div>
      <div className="mt-1 text-sm text-slate-400">{step.summary}</div>
      {step.toolNames.length ? <div className="mt-3 text-xs text-sky-200">{step.toolNames.join(', ')}</div> : null}
    </button>
  )
}
