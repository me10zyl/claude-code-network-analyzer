import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, RequestDiffSummary } from '@/lib/models/semantic'

import { NetworkRowBadges } from '@/components/network/network-row-badges'

interface NetworkTableProps {
  requests: NormalizedClaudeRequest[]
  classified: ClassifiedRequest[]
  diffs: Array<{ requestId: string; summary: RequestDiffSummary }>
  selectedRequestId: string | null
  onSelectRequest: (requestId: string) => void
}

export function NetworkTable({
  requests,
  classified,
  diffs,
  selectedRequestId,
  onSelectRequest,
}: NetworkTableProps) {
  const classifiedByRequestId = new Map(classified.map((item) => [item.requestId, item]))
  const diffByRequestId = new Map(diffs.map((item) => [item.requestId, item.summary]))

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-slate-950/30">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-950/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Step</th>
              <th className="px-4 py-3 font-medium">Tools</th>
              <th className="px-4 py-3 font-medium">Stop</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {requests.map((request) => {
              const semantic = classifiedByRequestId.get(request.id)
              const diff = diffByRequestId.get(request.id)
              const isSelected = selectedRequestId === request.id
              const toolNames = semantic?.toolCalls.map((tool) => tool.name) ?? []
              const stopReason = request.reconstructedMessage?.stopReason ?? '-'
              const model = request.body?.model ?? '-'

              return (
                <tr
                  key={request.id}
                  className={[
                    'cursor-pointer transition-colors hover:bg-slate-800/60',
                    isSelected ? 'bg-slate-800/80' : 'bg-transparent',
                  ].join(' ')}
                  onClick={() => onSelectRequest(request.id)}
                >
                  <td className="whitespace-nowrap px-4 py-3 align-top text-slate-300">{formatStartedAt(request.startedAt)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-100">{semantic?.stepType ?? 'unknown'}</div>
                    <div className="mt-1 text-xs text-slate-500">Request #{request.index}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-2">
                      <NetworkRowBadges tools={toolNames} />
                      <div className="text-xs text-slate-500">{request.reconstructedMessage?.content[0]?.type ?? '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-slate-300">{stopReason}</td>
                  <td className="px-4 py-3 align-top text-slate-300">{model}</td>
                  <td className="px-4 py-3 align-top">
                    {diff?.summaryLines.length ? (
                      <ul className="space-y-1 text-xs text-slate-400">
                        {diff.summaryLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatStartedAt(value: number) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
