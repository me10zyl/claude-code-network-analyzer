import { Upload } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-300">
        <Upload className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-slate-100">No HAR session loaded</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
        Select a Claude Code HAR export to inspect request flows, tools, and diffs.
      </p>
      <p className="mt-1 text-sm text-slate-500">Use Upload HAR in the top toolbar to load a session.</p>
    </div>
  )
}
