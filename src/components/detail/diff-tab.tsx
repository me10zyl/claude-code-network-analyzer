import type { RequestDiffSummary } from '@/lib/models/semantic'

interface DiffTabProps {
  diff?: RequestDiffSummary
}

export function DiffTab({ diff }: DiffTabProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      <h3 className="text-sm font-medium text-slate-200">Diff summary</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {diff?.summaryLines.length ? (
          diff.summaryLines.map((line) => <li key={line}>{line}</li>)
        ) : (
          <li className="text-slate-500">No diff summary available.</li>
        )}
      </ul>

      <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-2 xl:grid-cols-3">
        <Flag label="Changed" value={Boolean(diff?.changed)} />
        <Flag label="Tools changed" value={Boolean(diff?.toolsChanged)} />
        <Flag label="Messages changed" value={Boolean(diff?.messagesChanged)} />
        <Flag label="Assistant output changed" value={Boolean(diff?.assistantOutputChanged)} />
        <Flag label="System changed" value={Boolean(diff?.systemChanged)} />
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
          <div className="text-slate-500">Tool results added</div>
          <div className="mt-1 text-sm text-slate-100">{diff?.toolResultsAdded ?? 0}</div>
        </div>
      </div>
    </section>
  )
}

function Flag({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value ? 'Yes' : 'No'}</div>
    </div>
  )
}
