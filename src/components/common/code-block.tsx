interface CodeBlockProps {
  title?: string
  code: string
  language?: string
  emptyLabel?: string
}

export function CodeBlock({ title, code, language, emptyLabel = 'No content' }: CodeBlockProps) {
  const value = code.trim()

  return (
    <section className="space-y-2">
      {title ? <h3 className="text-sm font-medium text-slate-200">{title}</h3> : null}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
        {language ? <div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-wide text-slate-500">{language}</div> : null}
        <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-200">
          <code>{value || emptyLabel}</code>
        </pre>
      </div>
    </section>
  )
}
