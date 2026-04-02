import { JsonViewer } from '@/components/common/json-viewer'
import type { ClassifiedRequest } from '@/lib/models/semantic'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'

interface ToolsTabProps {
  request: NormalizedClaudeRequest
  classified?: ClassifiedRequest
}

export function ToolsTab({ request, classified }: ToolsTabProps) {
  const tools = request.body?.tools ?? []
  const toolCalls = classified?.toolCalls ?? []

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
        <h3 className="text-sm font-medium text-slate-200">Tool calls</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {toolCalls.length ? (
            toolCalls.map((tool) => (
              <span key={`${tool.id ?? tool.name}-${tool.name}`} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-200">
                {tool.name}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">No tool calls detected.</span>
          )}
        </div>
      </section>
      <JsonViewer title="Tool definitions" value={tools} emptyLabel="No tool definitions" />
    </div>
  )
}
