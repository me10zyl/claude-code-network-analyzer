import { CodeBlock } from '@/components/common/code-block'
import { JsonViewer } from '@/components/common/json-viewer'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'

interface ResponseTabProps {
  request: NormalizedClaudeRequest
}

export function ResponseTab({ request }: ResponseTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-3">
        <Meta label="Stop reason" value={request.reconstructedMessage?.stopReason ?? '-'} />
        <Meta label="Output tokens" value={String(request.reconstructedMessage?.usage?.output_tokens ?? 0)} />
        <Meta label="Content blocks" value={String(request.reconstructedMessage?.content.length ?? 0)} />
      </div>
      <JsonViewer title="Reconstructed assistant message" value={request.reconstructedMessage} emptyLabel="No reconstructed message" />
      <CodeBlock title="Raw response" code={request.rawResponseText} language="json" emptyLabel="No raw response text" />
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
