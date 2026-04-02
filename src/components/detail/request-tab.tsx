import { CodeBlock } from '@/components/common/code-block'
import { JsonViewer } from '@/components/common/json-viewer'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'

interface RequestTabProps {
  request: NormalizedClaudeRequest
}

export function RequestTab({ request }: RequestTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-4">
        <Meta label="Method" value={request.method} />
        <Meta label="Path" value={request.pathname} />
        <Meta label="Status" value={String(request.status)} />
        <Meta label="Duration" value={`${request.durationMs} ms`} />
      </div>
      <JsonViewer title="Parsed request body" value={request.body} emptyLabel="No parsed request body" />
      <CodeBlock title="Raw request" code={request.rawRequestText} language="json" emptyLabel="No raw request text" />
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-all text-slate-100">{value}</div>
    </div>
  )
}
