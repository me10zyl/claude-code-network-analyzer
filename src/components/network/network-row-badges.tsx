import { resolveToolMeta } from '@/lib/tool-registry'

interface NetworkRowBadgesProps {
  tools: string[]
}

export function NetworkRowBadges({ tools }: NetworkRowBadgesProps) {
  if (tools.length === 0) {
    return <span className="text-xs text-slate-500">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((tool) => {
        const meta = resolveToolMeta(tool)

        return (
          <span
            key={tool}
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${meta.colorClass}`}
            title={meta.category}
          >
            {meta.name}
          </span>
        )
      })}
    </div>
  )
}
