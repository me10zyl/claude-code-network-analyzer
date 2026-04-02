import type { AnalysisSession } from '@/features/sessions/build-analysis-session'
import { useSessionStore } from '@/stores/session-store'
import { readHarFile } from '@/features/har-import/read-har-file'
import { buildAnalysisSession } from '@/features/sessions/build-analysis-session'

vi.mock('@/features/har-import/read-har-file', () => ({
  readHarFile: vi.fn(),
}))

vi.mock('@/features/sessions/build-analysis-session', () => ({
  buildAnalysisSession: vi.fn(),
}))

const mockedReadHarFile = vi.mocked(readHarFile)
const mockedBuildAnalysisSession = vi.mocked(buildAnalysisSession)
const originalWorker = globalThis.Worker

function createSession(id: string): AnalysisSession {
  return {
    requests: [
      {
        id,
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        startedAt: 1,
        durationMs: 10,
        status: 200,
        requestHeaders: [],
        responseHeaders: [],
        body: { messages: [] },
        rawResponseText: '',
        sseEvents: [],
        reconstructedMessage: {
          id: `msg-${id}`,
          role: 'assistant',
          content: [],
          stopReason: null,
        },
      },
    ],
    classified: [],
    turns: [],
    diffs: [],
    stats: {
      totalEntries: 1,
      claudeRequests: 1,
      toolCalls: 0,
    },
  }
}

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, loading: false, error: null })
    mockedReadHarFile.mockReset()
    mockedBuildAnalysisSession.mockReset()
    globalThis.Worker = originalWorker
  })

  afterAll(() => {
    globalThis.Worker = originalWorker
  })

  it('falls back to main-thread parsing when Worker is unavailable', async () => {
    const session = createSession('fallback')
    mockedReadHarFile.mockResolvedValue('har-text')
    mockedBuildAnalysisSession.mockReturnValue(session)
    globalThis.Worker = undefined as typeof Worker

    await useSessionStore.getState().loadHar(new File(['har'], 'sample.har'))

    expect(mockedReadHarFile).toHaveBeenCalledTimes(1)
    expect(mockedBuildAnalysisSession).toHaveBeenCalledWith('har-text')
    expect(useSessionStore.getState()).toMatchObject({
      session,
      loading: false,
      error: null,
    })
  })

  it('parses through the worker when Worker is available', async () => {
    const workerSession = createSession('worker')
    mockedReadHarFile.mockResolvedValue('har-text')

    class MockWorker {
      private listeners = new Map<string, Set<(event: MessageEvent<unknown>) => void>>()
      terminate = vi.fn()

      addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
        const listeners = this.listeners.get(type) ?? new Set()
        listeners.add(listener)
        this.listeners.set(type, listeners)
      }

      removeEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
        this.listeners.get(type)?.delete(listener)
      }

      postMessage(data: string) {
        expect(data).toBe('har-text')
        this.listeners.get('message')?.forEach((listener) => {
          listener({ data: { ok: true, session: workerSession } } as MessageEvent)
        })
      }
    }

    const workerSpy = vi.fn(() => new MockWorker())
    globalThis.Worker = workerSpy as unknown as typeof Worker

    await useSessionStore.getState().loadHar(new File(['har'], 'sample.har'))

    expect(workerSpy).toHaveBeenCalledTimes(1)
    expect(mockedBuildAnalysisSession).not.toHaveBeenCalled()
    expect(useSessionStore.getState()).toMatchObject({
      session: workerSession,
      loading: false,
      error: null,
    })
  })
})
