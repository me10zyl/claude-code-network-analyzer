import { create } from 'zustand'

import { readHarFile } from '@/features/har-import/read-har-file'
import { buildAnalysisSession, type AnalysisSession } from '@/features/sessions/build-analysis-session'

type ParserWorkerResult =
  | { ok: true; session: AnalysisSession }
  | { ok: false; error: string }

async function parseHarWithWorker(harText: string): Promise<AnalysisSession> {
  if (typeof Worker === 'undefined') {
    return buildAnalysisSession(harText)
  }

  let worker: Worker

  try {
    worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return buildAnalysisSession(harText)
  }

  return new Promise<AnalysisSession>((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    }

    const handleMessage = (event: MessageEvent<ParserWorkerResult>) => {
      cleanup()

      if (event.data.ok) {
        resolve(event.data.session)
        return
      }

      reject(new Error(event.data.error))
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Failed to parse HAR file'))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage(harText)
  })
}

interface SessionStoreState {
  session: AnalysisSession | null
  loading: boolean
  error: string | null
  loadHar: (file: File) => Promise<void>
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  session: null,
  loading: false,
  error: null,
  async loadHar(file) {
    set({ loading: true, error: null })

    try {
      const harText = await readHarFile(file)
      const session = await parseHarWithWorker(harText)
      set({ session, loading: false, error: null })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load HAR file',
      })
    }
  },
}))
