import { buildAnalysisSession, type AnalysisSession } from '@/features/sessions/build-analysis-session'

type ParserWorkerResult =
  | { ok: true; session: AnalysisSession }
  | { ok: false; error: string }

self.onmessage = (event: MessageEvent<string>) => {
  try {
    const session = buildAnalysisSession(event.data)
    const result: ParserWorkerResult = { ok: true, session }
    self.postMessage(result)
  } catch (error) {
    const result: ParserWorkerResult = {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to parse HAR file',
    }
    self.postMessage(result)
  }
}
