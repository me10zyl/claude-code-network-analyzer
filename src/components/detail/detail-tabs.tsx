'use client'

import { DiffTab } from '@/components/detail/diff-tab'
import { RequestSummaryCard } from '@/components/detail/request-summary-card'
import { RequestTab } from '@/components/detail/request-tab'
import { ResponseTab } from '@/components/detail/response-tab'
import { TimelineContextTab } from '@/components/detail/timeline-context-tab'
import { ToolsTab } from '@/components/detail/tools-tab'
import { buildRequestSummaryCardVM } from '@/features/semantic/build-summary-card'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, ConversationTurn, RequestDiffSummary } from '@/lib/models/semantic'
import { useUiStore } from '@/stores/ui-store'

interface DetailTabsProps {
  request: NormalizedClaudeRequest
  classified?: ClassifiedRequest
  diff?: RequestDiffSummary
  turns: ConversationTurn[]
}

const tabOptions = [
  { id: 'summary', label: 'Overview' },
  { id: 'request', label: 'Request' },
  { id: 'response', label: 'Response' },
  { id: 'tools', label: 'Tools' },
  { id: 'diff', label: 'Diff' },
  { id: 'timeline', label: 'Timeline context' },
] as const

export function DetailTabs({ request, classified, diff, turns }: DetailTabsProps) {
  const { activeDetailTab, setActiveDetailTab } = useUiStore((state) => state)

  const summary = buildRequestSummaryCardVM(
    request,
    classified ?? {
      requestId: request.id,
      stepType: 'unknown',
      confidence: 0,
      reasons: [],
      toolCalls: [],
      hasToolResult: false,
      hasThinking: false,
    },
    diff ?? {
      changed: false,
      systemChanged: false,
      toolsChanged: false,
      messagesChanged: false,
      toolResultsAdded: 0,
      assistantOutputChanged: false,
      summaryLines: [],
    },
  )

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-2 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-wrap gap-2">
          {tabOptions.map((tab) => {
            const isActive = activeDetailTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDetailTab(tab.id)}
                className={[
                  'rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeDetailTab === 'summary' ? <RequestSummaryCard summary={summary} /> : null}
      {activeDetailTab === 'request' ? <RequestTab request={request} /> : null}
      {activeDetailTab === 'response' ? <ResponseTab request={request} /> : null}
      {activeDetailTab === 'tools' ? <ToolsTab request={request} classified={classified} /> : null}
      {activeDetailTab === 'diff' ? <DiffTab diff={diff} /> : null}
      {activeDetailTab === 'timeline' ? <TimelineContextTab requestId={request.id} turns={turns} /> : null}
    </div>
  )
}
