export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <section className="mx-auto max-w-5xl rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold">Claude Code Network Analyzer</h1>
        <p className="mt-3 text-sm text-slate-400">Upload a Reqable HAR file to inspect Claude Code request flows.</p>
        <div className="mt-10 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-12 text-center">
          <div className="text-lg font-medium">Upload HAR</div>
          <div className="mt-2 text-sm text-slate-500">No HAR session loaded</div>
        </div>
      </section>
    </main>
  )
}
