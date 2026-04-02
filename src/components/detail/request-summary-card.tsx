import type { RequestSummaryCardVM } from '@/lib/models/semantic'

interface RequestSummaryCardProps {
  summary: RequestSummaryCardVM
}

export function RequestSummaryCard({ summary }: RequestSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{summary.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{summary.subtitle}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>confidence</div>
          <div className="mt-1 text-sm font-medium text-slate-200">{Math.round(summary.confidence * 100)}%</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill label={summary.stepType} />
        {summary.stopReason ? <Pill label={`stop: ${summary.stopReason}`} /> : null}
        {summary.toolBadges.map((tool) => (
          <Pill key={tool} label={tool} accent />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-slate-200">Semantic reasons</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-400">
            {summary.semanticReasons.length ? (
              summary.semanticReasons.map((reason) => <li key={reason}>{reason}</li>)
            ) : (
              <li className="text-slate-500">No semantic reasons.</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-200">Diff highlights</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-400">
            {summary.diffHighlights.length ? (
              summary.diffHighlights.map((line) => <li key={line}>{line}</li>)
            ) : (
              <li className="text-slate-500">No diff highlights.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Pill({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span
      className={[
        'rounded-full border px-2.5 py-1 text-xs',
        accent ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-300',
      ].join(' ')}
    >
      {label}
    </span>
  )
}
