'use client'

import { useMemo } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { DetailTabs } from '@/components/detail/detail-tabs'
import { TopToolbar } from '@/components/layout/top-toolbar'
import { NetworkTable } from '@/components/network/network-table'
import { TimelineView } from '@/components/timeline/timeline-view'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import { useFilterStore } from '@/stores/filter-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useSessionStore } from '@/stores/session-store'
import { useUiStore } from '@/stores/ui-store'

export function AppShell() {
  const { session, loading, error, loadHar } = useSessionStore((state) => state)
  const { selectedRequestId, selectRequest } = useSelectionStore((state) => state)
  const { search, stepType, setSearch, setStepType } = useFilterStore((state) => state)
  const { leftPaneMode, setLeftPaneMode } = useUiStore((state) => state)

  const normalizedLeftPaneMode = leftPaneMode === 'timeline' ? 'timeline' : 'network'

  const filteredSession = useMemo(() => {
    if (!session) {
      return null
    }

    const loweredSearch = search.trim().toLowerCase()
    const classifiedByRequestId = new Map(session.classified.map((item) => [item.requestId, item]))
    const diffByRequestId = new Map(session.diffs.map((item) => [item.requestId, item.summary]))
    const includedRequestIds = session.requests
      .filter((request) => {
        const classified = classifiedByRequestId.get(request.id)

        if (stepType !== 'all' && classified?.stepType !== stepType) {
          return false
        }

        if (!loweredSearch) {
          return true
        }

        const diffSummary = diffByRequestId.get(request.id)

        return buildSearchableText(request, classified, diffSummary).includes(loweredSearch)
      })
      .map((request) => request.id)

    const includedRequestIdSet = new Set(includedRequestIds)

    return {
      requests: session.requests.filter((request) => includedRequestIdSet.has(request.id)),
      classified: session.classified.filter((item) => includedRequestIdSet.has(item.requestId)),
      diffs: session.diffs.filter((item) => includedRequestIdSet.has(item.requestId)),
      turns: session.turns
        .map((turn) => ({
          ...turn,
          steps: turn.steps.filter((step) => includedRequestIdSet.has(step.requestId)),
        }))
        .filter((turn) => turn.steps.length > 0),
    }
  }, [search, session, stepType])

  const selectedRequest = filteredSession?.requests.find((request) => request.id === selectedRequestId) ?? filteredSession?.requests[0] ?? null
  const selectedClassification = filteredSession?.classified.find((item) => item.requestId === selectedRequest?.id)
  const selectedDiff = filteredSession?.diffs.find((item) => item.requestId === selectedRequest?.id)?.summary

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <TopToolbar
          search={search}
          stepType={stepType}
          leftPaneMode={normalizedLeftPaneMode}
          loading={loading}
          sessionLoaded={Boolean(session)}
          stats={session?.stats}
          onUploadHar={loadHar}
          onSearchChange={setSearch}
          onStepTypeChange={setStepType}
          onLeftPaneModeChange={(mode) => setLeftPaneMode(mode === 'network' ? 'requests' : 'timeline')}
        />

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!session ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <section className="min-w-0">
              {normalizedLeftPaneMode === 'timeline' ? (
                <TimelineView
                  turns={filteredSession?.turns ?? []}
                  selectedRequestId={selectedRequest?.id ?? null}
                  onSelectRequest={selectRequest}
                />
              ) : (
                <NetworkTable
                  requests={filteredSession?.requests ?? []}
                  classified={filteredSession?.classified ?? []}
                  diffs={filteredSession?.diffs ?? []}
                  selectedRequestId={selectedRequest?.id ?? null}
                  onSelectRequest={selectRequest}
                />
              )}
            </section>

            <aside className="min-w-0">
              {selectedRequest ? (
                <DetailTabs
                  request={selectedRequest}
                  classified={selectedClassification}
                  diff={selectedDiff}
                  turns={session.turns}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center text-sm text-slate-400">
                  No request available for the current filters.
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

function buildSearchableText(
  request: NormalizedClaudeRequest,
  classified?: { stepType: string; toolCalls: Array<{ name: string }> },
  diffSummary?: { summaryLines: string[] },
) {
  return [
    request.body?.model,
    request.reconstructedMessage?.stopReason,
    request.pathname,
    classified?.stepType ?? 'unknown',
    ...(classified?.toolCalls.map((tool) => tool.name) ?? []),
    ...(diffSummary?.summaryLines ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
