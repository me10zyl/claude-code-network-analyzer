import type { ChangeEvent } from 'react'

import type { AgentStepType } from '@/lib/models/semantic'

interface TopToolbarProps {
  search: string
  stepType: AgentStepType | 'all'
  leftPaneMode: 'network' | 'timeline'
  loading: boolean
  sessionLoaded: boolean
  stats?: {
    totalEntries: number
    claudeRequests: number
    toolCalls: number
  }
  onUploadHar: (file: File) => void | Promise<void>
  onSearchChange: (value: string) => void
  onStepTypeChange: (value: AgentStepType | 'all') => void
  onLeftPaneModeChange: (value: 'network' | 'timeline') => void
}

const stepTypeOptions: Array<AgentStepType | 'all'> = [
  'all',
  'user_prompt',
  'planning',
  'tool_call',
  'observation',
  'final_answer',
  'mixed',
  'unknown',
]

export function TopToolbar({
  search,
  stepType,
  leftPaneMode,
  loading,
  sessionLoaded,
  stats,
  onUploadHar,
  onSearchChange,
  onStepTypeChange,
  onLeftPaneModeChange,
}: TopToolbarProps) {
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    await onUploadHar(file)
    event.target.value = ''
  }

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl shadow-slate-950/30 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            className="sr-only"
            type="file"
            accept=".har,application/json"
            onChange={handleFileChange}
          />
          <span className="inline-flex h-9 items-center rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700/80">
            {loading ? 'Loading HAR…' : 'Upload HAR'}
          </span>
        </label>

        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search steps, tools, model, stop reason"
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
          aria-label="Search requests"
        />

        <select
          value={stepType}
          onChange={(event) => onStepTypeChange(event.target.value as AgentStepType | 'all')}
          aria-label="Filter by step type"
          className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-slate-500"
        >
          {stepTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1">
          {(['network', 'timeline'] as const).map((mode) => {
            const active = leftPaneMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onLeftPaneModeChange(mode)}
                className={[
                  'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
                  active ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
                aria-pressed={active}
              >
                {mode}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <StatPill label="Entries" value={stats?.totalEntries ?? 0} muted={!sessionLoaded} />
        <StatPill label="Claude requests" value={stats?.claudeRequests ?? 0} muted={!sessionLoaded} />
        <StatPill label="Tool calls" value={stats?.toolCalls ?? 0} muted={!sessionLoaded} />
      </div>
    </header>
  )
}

function StatPill({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div
      className={[
        'rounded-full border px-3 py-1',
        muted ? 'border-slate-800 bg-slate-950/70 text-slate-500' : 'border-slate-700 bg-slate-950 text-slate-300',
      ].join(' ')}
    >
      <span className="text-slate-500">{label}</span>
      <span className="ml-2 font-medium text-slate-100">{value}</span>
    </div>
  )
}
