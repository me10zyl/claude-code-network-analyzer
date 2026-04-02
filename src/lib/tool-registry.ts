export interface ToolMeta {
  name: string
  category: 'web' | 'shell' | 'filesystem' | 'editor' | 'search' | 'mcp' | 'other'
  colorClass: string
}

const registry: ToolMeta[] = [
  { name: 'WebSearch', category: 'web', colorClass: 'bg-amber-500/15 text-amber-300' },
  { name: 'WebFetch', category: 'web', colorClass: 'bg-amber-500/15 text-amber-300' },
  { name: 'Bash', category: 'shell', colorClass: 'bg-rose-500/15 text-rose-300' },
  { name: 'Read', category: 'filesystem', colorClass: 'bg-sky-500/15 text-sky-300' },
  { name: 'Write', category: 'editor', colorClass: 'bg-emerald-500/15 text-emerald-300' },
  { name: 'Edit', category: 'editor', colorClass: 'bg-emerald-500/15 text-emerald-300' },
  { name: 'Glob', category: 'search', colorClass: 'bg-violet-500/15 text-violet-300' },
  { name: 'Grep', category: 'search', colorClass: 'bg-violet-500/15 text-violet-300' },
]

export function resolveToolMeta(name: string): ToolMeta {
  if (name.startsWith('mcp__')) {
    return { name, category: 'mcp', colorClass: 'bg-cyan-500/15 text-cyan-300' }
  }

  return (
    registry.find((tool) => tool.name === name) ?? {
      name,
      category: 'other',
      colorClass: 'bg-slate-500/15 text-slate-300',
    }
  )
}
