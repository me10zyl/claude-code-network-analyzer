# Claude Code Network Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP Next.js web app that ingests Reqable HAR files, reconstructs Anthropic `/v1/messages` SSE responses, classifies Claude Code workflow steps, and presents the results in a split Network + Agent Timeline analysis workspace.

**Architecture:** Keep the app pure-frontend and local-first. Parse HAR text in a worker-backed analysis pipeline, normalize protocol data once, derive semantic models (steps, timeline, diff summaries), and let the UI consume those structured results through small Zustand stores. Prioritize MVP phases 1-2 from the approved spec plus automatic diff summaries; defer manual two-request diff selection, IndexedDB caching, and other phase-3/4 polish.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Zod, TanStack Table, TanStack Virtual, Vitest, React Testing Library, Web Worker

---

## File Structure

### Root setup
- Create: `.gitignore` — ignore Next.js, test, and build outputs
- Create: `package.json` — scripts and dependencies
- Create: `tsconfig.json` — TS configuration and `@/*` alias
- Create: `next.config.ts` — Next config
- Create: `postcss.config.mjs` — Tailwind PostCSS pipeline
- Create: `tailwind.config.ts` — content scanning
- Create: `vitest.config.ts` — unit test config for jsdom + alias
- Create: `tests/setup.ts` — RTL + jest-dom setup

### App shell
- Create: `src/app/layout.tsx` — app document shell
- Create: `src/app/page.tsx` — top-level client page
- Create: `src/app/globals.css` — Tailwind imports and analysis UI styles

### Models and parsing
- Create: `src/lib/models/har.ts` — HAR and Reqable-safe schemas
- Create: `src/lib/models/normalized.ts` — normalized request/response/SSE/message types
- Create: `src/lib/models/semantic.ts` — classified request, timeline, summary card types
- Create: `src/features/parsing/parse-har.ts` — HAR parsing and Claude entry extraction
- Create: `src/features/parsing/parse-anthropic-request.ts` — request-body JSON parsing
- Create: `src/features/parsing/parse-anthropic-sse.ts` — SSE frame splitting and event parsing
- Create: `src/features/parsing/reconstruct-message.ts` — assistant text + tool_use reconstruction

### Semantic analysis
- Create: `src/lib/tool-registry.ts` — Claude Code tool metadata and categorization
- Create: `src/features/semantic/classify-step.ts` — planning/tool/observation/final classification
- Create: `src/features/semantic/build-timeline.ts` — turn and timeline reconstruction
- Create: `src/features/semantic/build-summary-card.ts` — overview card view model
- Create: `src/features/diff/diff-requests.ts` — lightweight diff summaries
- Create: `src/features/sessions/build-analysis-session.ts` — one-shot pipeline: HAR → normalized → semantic session

### Worker and stores
- Create: `src/workers/parser.worker.ts` — worker entry for analysis session building
- Create: `src/features/har-import/read-har-file.ts` — file-to-text helper
- Create: `src/stores/session-store.ts` — parsed session, loading, and upload action
- Create: `src/stores/selection-store.ts` — selected request and timeline node
- Create: `src/stores/filter-store.ts` — search + step-type filters
- Create: `src/stores/ui-store.ts` — active tabs and left-pane mode

### UI components
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/top-toolbar.tsx`
- Create: `src/components/common/empty-state.tsx`
- Create: `src/components/common/code-block.tsx`
- Create: `src/components/common/json-viewer.tsx`
- Create: `src/components/network/network-table.tsx`
- Create: `src/components/network/network-row-badges.tsx`
- Create: `src/components/detail/request-summary-card.tsx`
- Create: `src/components/detail/detail-tabs.tsx`
- Create: `src/components/detail/request-tab.tsx`
- Create: `src/components/detail/response-tab.tsx`
- Create: `src/components/detail/tools-tab.tsx`
- Create: `src/components/detail/diff-tab.tsx`
- Create: `src/components/detail/timeline-context-tab.tsx`
- Create: `src/components/timeline/timeline-view.tsx`
- Create: `src/components/timeline/timeline-node.tsx`

### Tests
- Create: `tests/app/home-page.test.tsx`
- Create: `tests/features/parsing/parse-har.test.ts`
- Create: `tests/features/parsing/parse-anthropic-sse.test.ts`
- Create: `tests/features/semantic/classify-step.test.ts`
- Create: `tests/features/semantic/build-timeline.test.ts`
- Create: `tests/features/diff/diff-requests.test.ts`
- Create: `tests/features/sessions/build-analysis-session.test.ts`
- Create: `tests/components/network-table.test.tsx`
- Create: `tests/components/detail-tabs.test.tsx`

## Task 1: Bootstrap the Next.js workspace and test harness

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Test: `tests/app/home-page.test.tsx`

- [ ] **Step 1: Initialize git and write the base config files**

```bash
git init
```

```gitignore
# .gitignore
node_modules
.next
coverage
/dist
.vitest
.env*
```

```json
// package.json
{
  "name": "claude-code-network-analyzer",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@tanstack/react-table": "^8.21.0",
    "@tanstack/react-virtual": "^3.11.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.469.0",
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "15.1.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
```

```js
// postcss.config.mjs
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

```ts
// vitest.config.ts
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Install dependencies and scaffold shadcn/ui**

Run:
```bash
npm install
npx shadcn@latest init -d
```

Expected: install completes successfully and `components.json` is created.

- [ ] **Step 3: Write the failing home-page test**

```tsx
// tests/app/home-page.test.tsx
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('shows the empty upload state before any HAR file is loaded', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Claude Code Network Analyzer' })).toBeInTheDocument()
    expect(screen.getByText('Upload HAR')).toBeInTheDocument()
    expect(screen.getByText('No HAR session loaded')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run:
```bash
npm test -- tests/app/home-page.test.tsx
```

Expected: FAIL with `Cannot find module '@/app/page'` or missing text assertions.

- [ ] **Step 5: Write the minimal app shell**

```tsx
// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Claude Code Network Analyzer',
  description: 'Analyze Reqable HAR files for Claude Code agent workflows.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// src/app/page.tsx
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
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #020617;
}
```

- [ ] **Step 6: Run test, lint, and build to verify the shell works**

Run:
```bash
npm test -- tests/app/home-page.test.tsx
npm run lint
npm run build
```

Expected:
- test PASS
- lint exits 0
- build completes with a production bundle

- [ ] **Step 7: Commit the bootstrap**

Run:
```bash
git add .
git commit -m "chore: bootstrap network analyzer workspace"
```

## Task 2: Parse HAR files and extract Claude requests

**Files:**
- Create: `src/lib/models/har.ts`
- Create: `src/lib/models/normalized.ts`
- Create: `src/features/parsing/parse-har.ts`
- Create: `src/features/parsing/parse-anthropic-request.ts`
- Test: `tests/features/parsing/parse-har.test.ts`

- [ ] **Step 1: Write the failing HAR parsing test**

```ts
// tests/features/parsing/parse-har.test.ts
import { describe, expect, it } from 'vitest'
import { extractClaudeEntries, parseHarText } from '@/features/parsing/parse-har'

const harText = JSON.stringify({
  log: {
    entries: [
      {
        startedDateTime: '2026-04-01T10:00:00.000Z',
        time: 150,
        request: {
          method: 'POST',
          url: 'https://api.anthropic.com/v1/messages',
          headers: [{ name: 'content-type', value: 'application/json' }],
          postData: {
            mimeType: 'application/json',
            text: JSON.stringify({
              model: 'claude-sonnet-4-6',
              system: 'You are Claude Code',
              messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
              tools: [{ name: 'WebSearch', input_schema: { type: 'object', properties: {} } }],
            }),
          },
        },
        response: {
          status: 200,
          headers: [{ name: 'content-type', value: 'text/event-stream' }],
          content: { text: '' },
        },
      },
      {
        startedDateTime: '2026-04-01T10:00:01.000Z',
        time: 20,
        request: {
          method: 'GET',
          url: 'https://example.com/logo.svg',
        },
        response: { status: 200, content: { text: '' } },
      },
    ],
  },
})

describe('parseHarText', () => {
  it('keeps only Claude /v1/messages entries and parses the request body', () => {
    const har = parseHarText(harText)
    const entries = extractClaudeEntries(har)

    expect(entries).toHaveLength(1)
    expect(entries[0].pathname).toBe('/v1/messages')
    expect(entries[0].body?.messages).toHaveLength(1)
    expect(entries[0].body?.tools?.[0].name).toBe('WebSearch')
  })
})
```

- [ ] **Step 2: Run the HAR parsing test to verify it fails**

Run:
```bash
npm test -- tests/features/parsing/parse-har.test.ts
```

Expected: FAIL with missing module `@/features/parsing/parse-har`.

- [ ] **Step 3: Implement HAR schemas and Claude entry extraction**

```ts
// src/lib/models/har.ts
import { z } from 'zod'

const HeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
})

const HarEntrySchema = z.object({
  startedDateTime: z.string(),
  time: z.number().default(0),
  request: z.object({
    method: z.string(),
    url: z.string(),
    headers: z.array(HeaderSchema).optional().default([]),
    postData: z
      .object({
        mimeType: z.string().optional(),
        text: z.string().optional(),
      })
      .optional(),
  }),
  response: z.object({
    status: z.number().default(0),
    headers: z.array(HeaderSchema).optional().default([]),
    content: z
      .object({
        mimeType: z.string().optional(),
        text: z.string().optional(),
        encoding: z.string().optional(),
      })
      .optional(),
  }),
})

export const HarFileSchema = z.object({
  log: z.object({
    entries: z.array(HarEntrySchema),
  }),
})

export type HarFile = z.infer<typeof HarFileSchema>
export type HarEntry = z.infer<typeof HarEntrySchema>
```

```ts
// src/lib/models/normalized.ts
export interface ClaudeContentBlock {
  type: string
  [key: string]: unknown
}

export interface AnthropicMessagesRequest {
  model?: string
  system?: string | unknown[]
  messages: Array<{ role: 'user' | 'assistant'; content: ClaudeContentBlock[] | string }>
  tools?: Array<{ name: string; description?: string; input_schema?: unknown }>
  tool_choice?: unknown
  thinking?: unknown
  max_tokens?: number
}

export interface NormalizedClaudeRequest {
  id: string
  index: number
  startedAt: number
  durationMs: number
  host: string
  pathname: string
  method: string
  status: number
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  body: AnthropicMessagesRequest | null
  rawRequestText: string
  rawResponseText: string
  sseEvents?: AnthropicSseEvent[]
  reconstructedMessage?: ReconstructedAssistantMessage
}
```

```ts
// src/features/parsing/parse-anthropic-request.ts
import { AnthropicMessagesRequest } from '@/lib/models/normalized'

export function parseAnthropicRequestBody(raw: string | undefined): AnthropicMessagesRequest | null {
  if (!raw) return null

  const parsed = JSON.parse(raw) as AnthropicMessagesRequest
  return parsed && Array.isArray(parsed.messages) ? parsed : null
}
```

```ts
// src/features/parsing/parse-har.ts
import { HarEntry, HarFile, HarFileSchema } from '@/lib/models/har'
import { NormalizedClaudeRequest } from '@/lib/models/normalized'
import { parseAnthropicRequestBody } from './parse-anthropic-request'

function headersToRecord(headers: Array<{ name: string; value: string }> = []) {
  return Object.fromEntries(headers.map((header) => [header.name.toLowerCase(), header.value]))
}

function isClaudeMessagesEntry(entry: HarEntry) {
  try {
    const url = new URL(entry.request.url)
    return entry.request.method === 'POST' && url.host === 'api.anthropic.com' && url.pathname === '/v1/messages'
  } catch {
    return false
  }
}

export function parseHarText(text: string): HarFile {
  return HarFileSchema.parse(JSON.parse(text))
}

export function extractClaudeEntries(har: HarFile): NormalizedClaudeRequest[] {
  return har.log.entries.filter(isClaudeMessagesEntry).map((entry, index) => {
    const url = new URL(entry.request.url)
    const rawRequestText = entry.request.postData?.text ?? ''
    const rawResponseText = entry.response.content?.text ?? ''

    return {
      id: `request-${index + 1}`,
      index: index + 1,
      startedAt: Date.parse(entry.startedDateTime),
      durationMs: entry.time,
      host: url.host,
      pathname: url.pathname,
      method: entry.request.method,
      status: entry.response.status,
      requestHeaders: headersToRecord(entry.request.headers),
      responseHeaders: headersToRecord(entry.response.headers),
      body: parseAnthropicRequestBody(rawRequestText),
      rawRequestText,
      rawResponseText,
    }
  })
}
```

- [ ] **Step 4: Run the HAR parsing test to verify it passes**

Run:
```bash
npm test -- tests/features/parsing/parse-har.test.ts
```

Expected: PASS with one parsed Claude request and one filtered-out non-Claude request.

- [ ] **Step 5: Commit the parsing baseline**

Run:
```bash
git add src/lib/models/har.ts src/lib/models/normalized.ts src/features/parsing/parse-har.ts src/features/parsing/parse-anthropic-request.ts tests/features/parsing/parse-har.test.ts
git commit -m "feat: parse har files and extract claude requests"
```

## Task 3: Reconstruct Anthropic SSE responses into assistant messages

**Files:**
- Modify: `src/lib/models/normalized.ts`
- Create: `src/features/parsing/parse-anthropic-sse.ts`
- Create: `src/features/parsing/reconstruct-message.ts`
- Test: `tests/features/parsing/parse-anthropic-sse.test.ts`

- [ ] **Step 1: Write the failing SSE reconstruction test**

```ts
// tests/features/parsing/parse-anthropic-sse.test.ts
import { describe, expect, it } from 'vitest'
import { parseAnthropicSse } from '@/features/parsing/parse-anthropic-sse'
import { reconstructAssistantMessage } from '@/features/parsing/reconstruct-message'

const rawSse = [
  'event: message_start\ndata: {"message":{"id":"msg_1","role":"assistant"}}',
  'event: content_block_start\ndata: {"index":0,"content_block":{"type":"text","text":""}}',
  'event: content_block_delta\ndata: {"index":0,"delta":{"type":"text_delta","text":"Planning..."}}',
  'event: content_block_start\ndata: {"index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"WebSearch","input":{}}}',
  'event: content_block_delta\ndata: {"index":1,"delta":{"type":"input_json_delta","partial_json":"{\"query\":\"claude code\""}}',
  'event: content_block_delta\ndata: {"index":1,"delta":{"type":"input_json_delta","partial_json":"}"}}',
  'event: message_delta\ndata: {"delta":{"stop_reason":"tool_use"},"usage":{"input_tokens":12,"output_tokens":7}}',
  'event: message_stop\ndata: {}',
].join('\n\n')

describe('Anthropic SSE reconstruction', () => {
  it('rebuilds text, tool_use input, stop reason, and usage', () => {
    const events = parseAnthropicSse(rawSse)
    const message = reconstructAssistantMessage(events)

    expect(events).toHaveLength(8)
    expect(message.content[0]).toEqual({ type: 'text', text: 'Planning...' })
    expect(message.content[1]).toEqual({
      type: 'tool_use',
      id: 'toolu_1',
      name: 'WebSearch',
      input: { query: 'claude code' },
      inputText: '{"query":"claude code"}',
    })
    expect(message.stopReason).toBe('tool_use')
    expect(message.usage?.output_tokens).toBe(7)
  })
})
```

- [ ] **Step 2: Run the SSE reconstruction test to verify it fails**

Run:
```bash
npm test -- tests/features/parsing/parse-anthropic-sse.test.ts
```

Expected: FAIL with missing parsing/reconstruction modules.

- [ ] **Step 3: Extend the normalized types for SSE and reconstructed messages**

```ts
// append to src/lib/models/normalized.ts
export interface AnthropicSseEvent {
  event: string
  data: unknown
  rawData: string
  seq: number
}

export type ReconstructedContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown; inputText: string }

export interface ReconstructedAssistantMessage {
  role: 'assistant'
  content: ReconstructedContentBlock[]
  stopReason?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}
```

- [ ] **Step 4: Implement SSE frame parsing and message reconstruction**

```ts
// src/features/parsing/parse-anthropic-sse.ts
import { AnthropicSseEvent } from '@/lib/models/normalized'

function parseFrame(frame: string, seq: number): AnthropicSseEvent | null {
  const lines = frame.split(/\r?\n/).filter(Boolean)
  const eventLine = lines.find((line) => line.startsWith('event:'))
  const dataLines = lines.filter((line) => line.startsWith('data:'))

  if (!eventLine || dataLines.length === 0) return null

  const event = eventLine.slice('event:'.length).trim()
  const rawData = dataLines.map((line) => line.slice('data:'.length).trim()).join('\n')

  let data: unknown = rawData
  try {
    data = JSON.parse(rawData)
  } catch {
    data = rawData
  }

  return { event, data, rawData, seq }
}

export function parseAnthropicSse(raw: string): AnthropicSseEvent[] {
  return raw
    .split(/\r?\n\r?\n/)
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame, index) => parseFrame(frame, index + 1))
    .filter((event): event is AnthropicSseEvent => Boolean(event))
}
```

```ts
// src/features/parsing/reconstruct-message.ts
import { AnthropicSseEvent, ReconstructedAssistantMessage } from '@/lib/models/normalized'

type MutableBlockState =
  | { type: 'text'; index: number; textParts: string[] }
  | { type: 'tool_use'; index: number; id: string; name: string; inputChunks: string[] }

export function reconstructAssistantMessage(events: AnthropicSseEvent[]): ReconstructedAssistantMessage {
  const blocks = new Map<number, MutableBlockState>()
  const message: ReconstructedAssistantMessage = { role: 'assistant', content: [] }

  for (const event of events) {
    const payload = typeof event.data === 'object' && event.data ? (event.data as Record<string, any>) : null
    if (!payload) continue

    if (event.event === 'content_block_start') {
      const index = payload.index as number
      const block = payload.content_block as Record<string, any>
      if (block.type === 'text') blocks.set(index, { type: 'text', index, textParts: [] })
      if (block.type === 'tool_use') {
        blocks.set(index, {
          type: 'tool_use',
          index,
          id: block.id,
          name: block.name,
          inputChunks: [],
        })
      }
    }

    if (event.event === 'content_block_delta') {
      const index = payload.index as number
      const block = blocks.get(index)
      const delta = payload.delta as Record<string, any>
      if (!block || !delta) continue
      if (block.type === 'text' && delta.type === 'text_delta') block.textParts.push(delta.text ?? '')
      if (block.type === 'tool_use' && delta.type === 'input_json_delta') block.inputChunks.push(delta.partial_json ?? '')
    }

    if (event.event === 'message_delta') {
      message.stopReason = payload.delta?.stop_reason
      message.usage = payload.usage
    }
  }

  message.content = [...blocks.values()]
    .sort((a, b) => a.index - b.index)
    .map((block) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.textParts.join('') }
      }
      const inputText = block.inputChunks.join('')
      let input: unknown = inputText
      try {
        input = JSON.parse(inputText)
      } catch {
        input = inputText
      }
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input,
        inputText,
      }
    })

  return message
}
```

- [ ] **Step 5: Run the SSE reconstruction test to verify it passes**

Run:
```bash
npm test -- tests/features/parsing/parse-anthropic-sse.test.ts
```

Expected: PASS with the text block, tool input JSON, stop reason, and usage reconstructed.

- [ ] **Step 6: Commit SSE parsing and reconstruction**

Run:
```bash
git add src/lib/models/normalized.ts src/features/parsing/parse-anthropic-sse.ts src/features/parsing/reconstruct-message.ts tests/features/parsing/parse-anthropic-sse.test.ts
git commit -m "feat: reconstruct anthropic sse responses"
```

## Task 4: Classify Claude workflow steps, build timelines, and summarize diffs

**Files:**
- Create: `src/lib/models/semantic.ts`
- Create: `src/lib/tool-registry.ts`
- Create: `src/features/semantic/classify-step.ts`
- Create: `src/features/semantic/build-timeline.ts`
- Create: `src/features/semantic/build-summary-card.ts`
- Create: `src/features/diff/diff-requests.ts`
- Test: `tests/features/semantic/classify-step.test.ts`
- Test: `tests/features/semantic/build-timeline.test.ts`
- Test: `tests/features/diff/diff-requests.test.ts`

- [ ] **Step 1: Write the failing semantic-analysis tests**

```ts
// tests/features/semantic/classify-step.test.ts
import { describe, expect, it } from 'vitest'
import { classifyClaudeRequest } from '@/features/semantic/classify-step'
import { NormalizedClaudeRequest } from '@/lib/models/normalized'

function baseRequest(overrides: Partial<NormalizedClaudeRequest>): NormalizedClaudeRequest {
  return {
    id: 'r1',
    index: 1,
    startedAt: 1,
    durationMs: 120,
    host: 'api.anthropic.com',
    pathname: '/v1/messages',
    method: 'POST',
    status: 200,
    requestHeaders: {},
    responseHeaders: {},
    body: { messages: [], thinking: undefined },
    rawRequestText: '',
    rawResponseText: '',
    ...overrides,
  }
}

describe('classifyClaudeRequest', () => {
  it('classifies tool calls from tool_use output', () => {
    const result = classifyClaudeRequest(
      baseRequest({
        reconstructedMessage: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'toolu_1', name: 'WebSearch', input: {}, inputText: '{}' }],
          stopReason: 'tool_use',
        },
      }),
      undefined,
      undefined,
    )

    expect(result.stepType).toBe('tool_call')
    expect(result.toolCalls[0].name).toBe('WebSearch')
    expect(result.confidence).toBeGreaterThan(0.8)
  })
})
```

```ts
// tests/features/semantic/build-timeline.test.ts
import { describe, expect, it } from 'vitest'
import { buildConversationTimeline } from '@/features/semantic/build-timeline'

const requests = [
  { id: 'r1', index: 1, startedAt: 1 },
  { id: 'r2', index: 2, startedAt: 2 },
  { id: 'r3', index: 3, startedAt: 3 },
] as any

const classified = [
  { requestId: 'r1', stepType: 'planning', confidence: 0.9, reasons: ['thinking enabled'], toolCalls: [], hasToolResult: false, hasThinking: true },
  { requestId: 'r2', stepType: 'tool_call', confidence: 0.99, reasons: ['tool_use block'], toolCalls: [{ name: 'WebSearch' }], hasToolResult: false, hasThinking: false },
  { requestId: 'r3', stepType: 'final_answer', confidence: 0.95, reasons: ['text only'], toolCalls: [], hasToolResult: true, hasThinking: false },
]

describe('buildConversationTimeline', () => {
  it('groups sequential requests into one turn', () => {
    const turns = buildConversationTimeline(requests, classified)

    expect(turns).toHaveLength(1)
    expect(turns[0].steps.map((step) => step.type)).toEqual(['planning', 'tool_call', 'final_answer'])
  })
})
```

```ts
// tests/features/diff/diff-requests.test.ts
import { describe, expect, it } from 'vitest'
import { diffClaudeRequests } from '@/features/diff/diff-requests'

const prev = {
  body: { system: 'base', messages: [{ role: 'user', content: 'a' }], tools: [{ name: 'WebSearch' }] },
  reconstructedMessage: { role: 'assistant', content: [{ type: 'text', text: 'draft' }] },
} as any

const current = {
  body: {
    system: 'base',
    messages: [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] },
    ],
    tools: [{ name: 'WebSearch' }, { name: 'WebFetch' }],
  },
  reconstructedMessage: { role: 'assistant', content: [{ type: 'text', text: 'final' }] },
} as any

describe('diffClaudeRequests', () => {
  it('summarizes tool changes and new tool results', () => {
    const diff = diffClaudeRequests(prev, current)

    expect(diff.summary.toolsChanged).toBe(true)
    expect(diff.summary.toolResultsAdded).toBe(1)
    expect(diff.summary.summaryLines).toContain('Added 1 tool result block.')
  })
})
```

- [ ] **Step 2: Run the semantic-analysis tests to verify they fail**

Run:
```bash
npm test -- tests/features/semantic/classify-step.test.ts tests/features/semantic/build-timeline.test.ts tests/features/diff/diff-requests.test.ts
```

Expected: FAIL with missing semantic-analysis modules.

- [ ] **Step 3: Define semantic types and tool metadata**

```ts
// src/lib/models/semantic.ts
export type AgentStepType = 'user_prompt' | 'planning' | 'tool_call' | 'observation' | 'final_answer' | 'mixed' | 'unknown'

export interface ClassifiedRequest {
  requestId: string
  stepType: AgentStepType
  confidence: number
  reasons: string[]
  toolCalls: Array<{ id?: string; name: string }>
  hasToolResult: boolean
  hasThinking: boolean
}

export interface TimelineStep {
  id: string
  requestId: string
  type: AgentStepType
  title: string
  summary: string
  toolNames: string[]
  startedAt: number
}

export interface ConversationTurn {
  id: string
  startedAt: number
  endedAt?: number
  steps: TimelineStep[]
}

export interface RequestDiffSummary {
  changed: boolean
  systemChanged: boolean
  toolsChanged: boolean
  messagesChanged: boolean
  toolResultsAdded: number
  assistantOutputChanged: boolean
  summaryLines: string[]
}

export interface RequestSummaryCardVM {
  title: string
  subtitle: string
  stepType: AgentStepType
  confidence: number
  toolBadges: string[]
  stopReason?: string
  diffHighlights: string[]
  semanticReasons: string[]
}
```

```ts
// src/lib/tool-registry.ts
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
  return registry.find((tool) => tool.name === name) ?? { name, category: 'other', colorClass: 'bg-slate-500/15 text-slate-300' }
}
```

- [ ] **Step 4: Implement classification, timeline building, diff summaries, and summary-card VM**

```ts
// src/features/semantic/classify-step.ts
import { NormalizedClaudeRequest } from '@/lib/models/normalized'
import { ClassifiedRequest } from '@/lib/models/semantic'

export function classifyClaudeRequest(
  current: NormalizedClaudeRequest,
  prev?: NormalizedClaudeRequest,
  _next?: NormalizedClaudeRequest,
): ClassifiedRequest {
  const toolCalls = current.reconstructedMessage?.content.filter((block) => block.type === 'tool_use').map((block) => ({ id: block.id, name: block.name })) ?? []
  const hasToolResult = JSON.stringify(current.body?.messages ?? []).includes('tool_result')
  const hasThinking = Boolean(current.body?.thinking)
  const reasons: string[] = []

  let stepType: ClassifiedRequest['stepType'] = 'unknown'
  let confidence = 0.45

  if (toolCalls.length > 0 || current.reconstructedMessage?.stopReason === 'tool_use') {
    stepType = 'tool_call'
    confidence = 0.99
    reasons.push('assistant emitted tool_use content')
  } else if (hasToolResult) {
    stepType = 'observation'
    confidence = 0.9
    reasons.push('request messages include tool_result blocks')
  } else if (hasThinking) {
    stepType = 'planning'
    confidence = 0.88
    reasons.push('thinking config is enabled')
  } else if (current.reconstructedMessage?.content.every((block) => block.type === 'text')) {
    stepType = 'final_answer'
    confidence = 0.84
    reasons.push('assistant response is text-only')
  }

  if (prev?.body?.messages && current.body?.messages && current.body.messages.length > prev.body.messages.length) {
    reasons.push('message history grew from previous request')
  }

  return { requestId: current.id, stepType, confidence, reasons, toolCalls, hasToolResult, hasThinking }
}
```

```ts
// src/features/semantic/build-timeline.ts
import { ConversationTurn, ClassifiedRequest, TimelineStep } from '@/lib/models/semantic'
import { NormalizedClaudeRequest } from '@/lib/models/normalized'

export function buildConversationTimeline(requests: NormalizedClaudeRequest[], classified: ClassifiedRequest[]): ConversationTurn[] {
  const byId = new Map(classified.map((item) => [item.requestId, item]))
  const turns: ConversationTurn[] = []
  let currentTurn: ConversationTurn | null = null

  for (const request of [...requests].sort((a, b) => a.startedAt - b.startedAt)) {
    const classification = byId.get(request.id)
    if (!classification) continue

    if (!currentTurn) {
      currentTurn = { id: `turn-${turns.length + 1}`, startedAt: request.startedAt, steps: [] }
      turns.push(currentTurn)
    }

    const step: TimelineStep = {
      id: `step-${request.id}`,
      requestId: request.id,
      type: classification.stepType,
      title: classification.stepType.replace('_', ' '),
      summary: classification.reasons[0] ?? 'Derived from request data',
      toolNames: classification.toolCalls.map((tool) => tool.name),
      startedAt: request.startedAt,
    }
    currentTurn.steps.push(step)

    if (classification.stepType === 'final_answer') {
      currentTurn.endedAt = request.startedAt
      currentTurn = null
    }
  }

  return turns
}
```

```ts
// src/features/diff/diff-requests.ts
import { NormalizedClaudeRequest } from '@/lib/models/normalized'
import { RequestDiffSummary } from '@/lib/models/semantic'

export function diffClaudeRequests(prev: NormalizedClaudeRequest | undefined, current: NormalizedClaudeRequest): { summary: RequestDiffSummary } {
  if (!prev) {
    return {
      summary: {
        changed: false,
        systemChanged: false,
        toolsChanged: false,
        messagesChanged: false,
        toolResultsAdded: 0,
        assistantOutputChanged: false,
        summaryLines: ['No previous comparable request.'],
      },
    }
  }

  const prevSystem = JSON.stringify(prev.body?.system ?? null)
  const currentSystem = JSON.stringify(current.body?.system ?? null)
  const prevTools = JSON.stringify(prev.body?.tools ?? [])
  const currentTools = JSON.stringify(current.body?.tools ?? [])
  const prevMessages = JSON.stringify(prev.body?.messages ?? [])
  const currentMessages = JSON.stringify(current.body?.messages ?? [])
  const prevOutput = JSON.stringify(prev.reconstructedMessage?.content ?? [])
  const currentOutput = JSON.stringify(current.reconstructedMessage?.content ?? [])
  const toolResultsAdded = Math.max(currentMessages.split('tool_result').length - prevMessages.split('tool_result').length, 0)

  const summaryLines: string[] = []
  if (prevTools !== currentTools) summaryLines.push('Tool definitions changed.')
  if (toolResultsAdded > 0) summaryLines.push(`Added ${toolResultsAdded} tool result block.`)
  if (prevOutput !== currentOutput) summaryLines.push('Assistant output changed.')
  if (summaryLines.length === 0) summaryLines.push('No meaningful change detected.')

  return {
    summary: {
      changed: summaryLines[0] !== 'No meaningful change detected.',
      systemChanged: prevSystem !== currentSystem,
      toolsChanged: prevTools !== currentTools,
      messagesChanged: prevMessages !== currentMessages,
      toolResultsAdded,
      assistantOutputChanged: prevOutput !== currentOutput,
      summaryLines,
    },
  }
}
```

```ts
// src/features/semantic/build-summary-card.ts
import { NormalizedClaudeRequest } from '@/lib/models/normalized'
import { ClassifiedRequest, RequestDiffSummary, RequestSummaryCardVM } from '@/lib/models/semantic'

export function buildRequestSummaryCardVM(
  request: NormalizedClaudeRequest,
  classified: ClassifiedRequest,
  diff: RequestDiffSummary,
): RequestSummaryCardVM {
  return {
    title: `Request #${request.index}`,
    subtitle: `${classified.stepType} · ${request.pathname}`,
    stepType: classified.stepType,
    confidence: classified.confidence,
    toolBadges: classified.toolCalls.map((tool) => tool.name),
    stopReason: request.reconstructedMessage?.stopReason,
    diffHighlights: diff.summaryLines,
    semanticReasons: classified.reasons,
  }
}
```

- [ ] **Step 5: Run the semantic-analysis tests to verify they pass**

Run:
```bash
npm test -- tests/features/semantic/classify-step.test.ts tests/features/semantic/build-timeline.test.ts tests/features/diff/diff-requests.test.ts
```

Expected: PASS with planning/tool/final classes, one turn, and diff summary output.

- [ ] **Step 6: Commit the semantic-analysis layer**

Run:
```bash
git add src/lib/models/semantic.ts src/lib/tool-registry.ts src/features/semantic/classify-step.ts src/features/semantic/build-timeline.ts src/features/semantic/build-summary-card.ts src/features/diff/diff-requests.ts tests/features/semantic/classify-step.test.ts tests/features/semantic/build-timeline.test.ts tests/features/diff/diff-requests.test.ts
git commit -m "feat: derive workflow steps and diff summaries"
```

## Task 5: Build the end-to-end analysis session pipeline and stores

**Files:**
- Create: `src/features/sessions/build-analysis-session.ts`
- Create: `src/workers/parser.worker.ts`
- Create: `src/features/har-import/read-har-file.ts`
- Create: `src/stores/session-store.ts`
- Create: `src/stores/selection-store.ts`
- Create: `src/stores/filter-store.ts`
- Create: `src/stores/ui-store.ts`
- Test: `tests/features/sessions/build-analysis-session.test.ts`

- [ ] **Step 1: Write the failing analysis-session test**

```ts
// tests/features/sessions/build-analysis-session.test.ts
import { describe, expect, it } from 'vitest'
import { buildAnalysisSession } from '@/features/sessions/build-analysis-session'

const harText = JSON.stringify({
  log: {
    entries: [
      {
        startedDateTime: '2026-04-01T10:00:00.000Z',
        time: 200,
        request: {
          method: 'POST',
          url: 'https://api.anthropic.com/v1/messages',
          headers: [{ name: 'content-type', value: 'application/json' }],
          postData: {
            text: JSON.stringify({
              model: 'claude-sonnet-4-6',
              thinking: { type: 'enabled' },
              messages: [{ role: 'user', content: [{ type: 'text', text: 'Find docs' }] }],
              tools: [{ name: 'WebSearch', input_schema: { type: 'object' } }],
            }),
          },
        },
        response: {
          status: 200,
          headers: [{ name: 'content-type', value: 'text/event-stream' }],
          content: {
            text: 'event: content_block_start\ndata: {"index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"WebSearch","input":{}}}\n\nevent: content_block_delta\ndata: {"index":0,"delta":{"type":"input_json_delta","partial_json":"{\"query\":\"docs\"}"}}\n\nevent: message_delta\ndata: {"delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":5}}\n\nevent: message_stop\ndata: {}',
          },
        },
      },
    ],
  },
})

describe('buildAnalysisSession', () => {
  it('returns normalized requests, classifications, turns, and stats', () => {
    const session = buildAnalysisSession(harText)

    expect(session.requests).toHaveLength(1)
    expect(session.classified[0].stepType).toBe('tool_call')
    expect(session.turns).toHaveLength(1)
    expect(session.stats.claudeRequests).toBe(1)
  })
})
```

- [ ] **Step 2: Run the analysis-session test to verify it fails**

Run:
```bash
npm test -- tests/features/sessions/build-analysis-session.test.ts
```

Expected: FAIL with missing session pipeline module.

- [ ] **Step 3: Implement the analysis session builder, worker, and Zustand stores**

```ts
// src/features/sessions/build-analysis-session.ts
import { extractClaudeEntries, parseHarText } from '@/features/parsing/parse-har'
import { parseAnthropicSse } from '@/features/parsing/parse-anthropic-sse'
import { reconstructAssistantMessage } from '@/features/parsing/reconstruct-message'
import { buildConversationTimeline } from '@/features/semantic/build-timeline'
import { classifyClaudeRequest } from '@/features/semantic/classify-step'
import { diffClaudeRequests } from '@/features/diff/diff-requests'

export interface AnalysisSession {
  requests: any[]
  classified: any[]
  turns: any[]
  diffs: Record<string, ReturnType<typeof diffClaudeRequests>>
  stats: {
    totalEntries: number
    claudeRequests: number
    toolCalls: number
  }
}

export function buildAnalysisSession(harText: string): AnalysisSession {
  const har = parseHarText(harText)
  const requests = extractClaudeEntries(har).map((request) => {
    const sseEvents = parseAnthropicSse(request.rawResponseText)
    const reconstructedMessage = request.rawResponseText ? reconstructAssistantMessage(sseEvents) : undefined
    return { ...request, sseEvents, reconstructedMessage }
  })

  const classified = requests.map((request, index) => classifyClaudeRequest(request, requests[index - 1], requests[index + 1]))
  const turns = buildConversationTimeline(requests, classified)
  const diffs = Object.fromEntries(requests.map((request, index) => [request.id, diffClaudeRequests(requests[index - 1], request)]))

  return {
    requests,
    classified,
    turns,
    diffs,
    stats: {
      totalEntries: har.log.entries.length,
      claudeRequests: requests.length,
      toolCalls: classified.filter((item) => item.stepType === 'tool_call').length,
    },
  }
}
```

```ts
// src/workers/parser.worker.ts
import { buildAnalysisSession } from '@/features/sessions/build-analysis-session'

self.onmessage = (event: MessageEvent<{ harText: string }>) => {
  const session = buildAnalysisSession(event.data.harText)
  self.postMessage(session)
}
```

```ts
// src/features/har-import/read-har-file.ts
export async function readHarFile(file: File) {
  return file.text()
}
```

```ts
// src/stores/session-store.ts
'use client'

import { create } from 'zustand'
import { buildAnalysisSession, AnalysisSession } from '@/features/sessions/build-analysis-session'
import { readHarFile } from '@/features/har-import/read-har-file'

interface SessionState {
  session: AnalysisSession | null
  loading: boolean
  error: string | null
  loadHar: (file: File) => Promise<void>
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loading: false,
  error: null,
  async loadHar(file) {
    set({ loading: true, error: null })
    try {
      const harText = await readHarFile(file)
      const session = buildAnalysisSession(harText)
      set({ session, loading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load HAR', loading: false })
    }
  },
}))
```

```ts
// src/stores/selection-store.ts
'use client'
import { create } from 'zustand'

export const useSelectionStore = create<{ selectedRequestId: string | null; selectRequest: (id: string) => void }>((set) => ({
  selectedRequestId: null,
  selectRequest: (selectedRequestId) => set({ selectedRequestId }),
}))
```

```ts
// src/stores/filter-store.ts
'use client'
import { create } from 'zustand'
import { AgentStepType } from '@/lib/models/semantic'

export const useFilterStore = create<{
  search: string
  stepType: AgentStepType | 'all'
  setSearch: (value: string) => void
  setStepType: (value: AgentStepType | 'all') => void
}>((set) => ({
  search: '',
  stepType: 'all',
  setSearch: (search) => set({ search }),
  setStepType: (stepType) => set({ stepType }),
}))
```

```ts
// src/stores/ui-store.ts
'use client'
import { create } from 'zustand'

export const useUiStore = create<{
  leftPaneMode: 'network' | 'timeline'
  activeDetailTab: 'overview' | 'request' | 'response' | 'tools' | 'diff' | 'timeline'
  setLeftPaneMode: (mode: 'network' | 'timeline') => void
  setActiveDetailTab: (tab: 'overview' | 'request' | 'response' | 'tools' | 'diff' | 'timeline') => void
}>((set) => ({
  leftPaneMode: 'network',
  activeDetailTab: 'overview',
  setLeftPaneMode: (leftPaneMode) => set({ leftPaneMode }),
  setActiveDetailTab: (activeDetailTab) => set({ activeDetailTab }),
}))
```

- [ ] **Step 4: Run the analysis-session test to verify it passes**

Run:
```bash
npm test -- tests/features/sessions/build-analysis-session.test.ts
```

Expected: PASS with one tool-call request, one turn, and correct request counts.

- [ ] **Step 5: Commit the analysis pipeline and stores**

Run:
```bash
git add src/features/sessions/build-analysis-session.ts src/workers/parser.worker.ts src/features/har-import/read-har-file.ts src/stores/session-store.ts src/stores/selection-store.ts src/stores/filter-store.ts src/stores/ui-store.ts tests/features/sessions/build-analysis-session.test.ts
git commit -m "feat: assemble analysis sessions and stores"
```

## Task 6: Build the split workspace shell and network table

**Files:**
- Create: `src/components/common/empty-state.tsx`
- Create: `src/components/layout/top-toolbar.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/network/network-row-badges.tsx`
- Create: `src/components/network/network-table.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/components/network-table.test.tsx`
- Test: `tests/app/home-page.test.tsx`

- [ ] **Step 1: Write the failing network-table rendering test**

```tsx
// tests/components/network-table.test.tsx
import { render, screen } from '@testing-library/react'
import { NetworkTable } from '@/components/network/network-table'

const rows = [
  {
    id: 'request-1',
    index: 1,
    startedAt: Date.parse('2026-04-01T10:00:00.000Z'),
    durationMs: 220,
    body: { model: 'claude-sonnet-4-6' },
    reconstructedMessage: { stopReason: 'tool_use' },
    classification: { stepType: 'tool_call', toolCalls: [{ name: 'WebSearch' }] },
    diffSummary: { summaryLines: ['Added 1 tool result block.'] },
  },
] as any

describe('NetworkTable', () => {
  it('renders the key workflow columns for Claude requests', () => {
    render(<NetworkTable rows={rows} selectedRequestId={null} onSelect={() => undefined} />)

    expect(screen.getByText('tool_call')).toBeInTheDocument()
    expect(screen.getByText('WebSearch')).toBeInTheDocument()
    expect(screen.getByText('tool_use')).toBeInTheDocument()
    expect(screen.getByText('Added 1 tool result block.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the network-table test to verify it fails**

Run:
```bash
npm test -- tests/components/network-table.test.tsx
```

Expected: FAIL with missing `network-table` component.

- [ ] **Step 3: Implement the empty state, toolbar, network table, and app shell**

```tsx
// src/components/common/empty-state.tsx
export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">No HAR session loaded</h2>
        <p className="mt-2 text-sm text-slate-400">Upload HAR to inspect Claude Code request flows.</p>
      </div>
    </div>
  )
}
```

```tsx
// src/components/layout/top-toolbar.tsx
'use client'

import { ChangeEvent } from 'react'

interface TopToolbarProps {
  onFileChange: (file: File | null) => void
  search: string
  onSearchChange: (value: string) => void
  stepType: string
  onStepTypeChange: (value: string) => void
  leftPaneMode: 'network' | 'timeline'
  onLeftPaneModeChange: (mode: 'network' | 'timeline') => void
  stats?: { totalEntries: number; claudeRequests: number; toolCalls: number }
}

export function TopToolbar(props: TopToolbarProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    props.onFileChange(event.target.files?.[0] ?? null)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <label className="inline-flex cursor-pointer items-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950">
        Upload HAR
        <input className="hidden" type="file" accept=".har,application/json" onChange={handleFileChange} />
      </label>
      <input
        className="min-w-56 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        placeholder="Search tool, step, or model"
        value={props.search}
        onChange={(event) => props.onSearchChange(event.target.value)}
      />
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        value={props.stepType}
        onChange={(event) => props.onStepTypeChange(event.target.value)}
      >
        <option value="all">All steps</option>
        <option value="planning">Planning</option>
        <option value="tool_call">Tool Call</option>
        <option value="observation">Observation</option>
        <option value="final_answer">Final Answer</option>
      </select>
      <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
        <button className={props.leftPaneMode === 'network' ? 'rounded bg-slate-700 px-3 py-2 text-white' : 'rounded bg-slate-800 px-3 py-2'} onClick={() => props.onLeftPaneModeChange('network')}>Network</button>
        <button className={props.leftPaneMode === 'timeline' ? 'rounded bg-slate-700 px-3 py-2 text-white' : 'rounded bg-slate-800 px-3 py-2'} onClick={() => props.onLeftPaneModeChange('timeline')}>Timeline</button>
        <span>Total: {props.stats?.totalEntries ?? 0}</span>
        <span>Claude: {props.stats?.claudeRequests ?? 0}</span>
        <span>Tool Calls: {props.stats?.toolCalls ?? 0}</span>
      </div>
    </div>
  )
}
```

```tsx
// src/components/network/network-row-badges.tsx
import { resolveToolMeta } from '@/lib/tool-registry'

export function NetworkRowBadges({ tools }: { tools: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tools.map((tool) => {
        const meta = resolveToolMeta(tool)
        return (
          <span key={tool} className={`rounded px-2 py-0.5 text-xs font-medium ${meta.colorClass}`}>
            {tool}
          </span>
        )
      })}
    </div>
  )
}
```

```tsx
// src/components/network/network-table.tsx
'use client'

import { format } from 'date-fns'
import { NetworkRowBadges } from './network-row-badges'

interface NetworkTableProps {
  rows: any[]
  selectedRequestId: string | null
  onSelect: (id: string) => void
}

export function NetworkTable({ rows, selectedRequestId, onSelect }: NetworkTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900">
          <tr className="text-left text-slate-400">
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Step</th>
            <th className="px-3 py-2">Tools</th>
            <th className="px-3 py-2">Stop</th>
            <th className="px-3 py-2">Model</th>
            <th className="px-3 py-2">Diff</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40">
          {rows.map((row) => (
            <tr key={row.id} className={row.id === selectedRequestId ? 'bg-slate-800/70' : 'hover:bg-slate-900/60'} onClick={() => onSelect(row.id)}>
              <td className="px-3 py-2">{format(row.startedAt, 'HH:mm:ss')}</td>
              <td className="px-3 py-2 font-medium text-slate-100">{row.classification.stepType}</td>
              <td className="px-3 py-2"><NetworkRowBadges tools={row.classification.toolCalls.map((tool: any) => tool.name)} /></td>
              <td className="px-3 py-2 text-slate-300">{row.reconstructedMessage?.stopReason ?? '—'}</td>
              <td className="px-3 py-2 text-slate-300">{row.body?.model ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-slate-400">{row.diffSummary.summaryLines[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

```tsx
// src/components/layout/app-shell.tsx
'use client'

import { useMemo } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { NetworkTable } from '@/components/network/network-table'
import { TopToolbar } from '@/components/layout/top-toolbar'
import { useFilterStore } from '@/stores/filter-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useSessionStore } from '@/stores/session-store'
import { useUiStore } from '@/stores/ui-store'

export function AppShell() {
  const { session, loadHar } = useSessionStore()
  const { selectedRequestId, selectRequest } = useSelectionStore()
  const { search, stepType, setSearch, setStepType } = useFilterStore()
  const { leftPaneMode, setLeftPaneMode } = useUiStore()

  const rows = useMemo(() => {
    if (!session) return []
    return session.requests
      .map((request) => ({
        ...request,
        classification: session.classified.find((item) => item.requestId === request.id),
        diffSummary: session.diffs[request.id].summary,
      }))
      .filter((row) => (stepType === 'all' ? true : row.classification.stepType === stepType))
      .filter((row) => {
        const haystack = JSON.stringify([row.classification.stepType, row.body?.model, row.classification.toolCalls])
        return haystack.toLowerCase().includes(search.toLowerCase())
      })
  }, [search, session, stepType])

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <TopToolbar
          onFileChange={(file) => file && loadHar(file)}
          search={search}
          onSearchChange={setSearch}
          stepType={stepType}
          onStepTypeChange={(value) => setStepType(value as any)}
          leftPaneMode={leftPaneMode}
          onLeftPaneModeChange={setLeftPaneMode}
          stats={session?.stats}
        />
        {session ? <NetworkTable rows={rows} selectedRequestId={selectedRequestId} onSelect={selectRequest} /> : <EmptyState />}
      </div>
    </main>
  )
}
```

```tsx
// src/app/page.tsx
'use client'

import { AppShell } from '@/components/layout/app-shell'

export default function HomePage() {
  return <AppShell />
}
```

- [ ] **Step 4: Run the home-page and network-table tests to verify they pass**

Run:
```bash
npm test -- tests/app/home-page.test.tsx tests/components/network-table.test.tsx
```

Expected: PASS with the upload empty state and the network row columns rendered.

- [ ] **Step 5: Commit the split workspace shell**

Run:
```bash
git add src/components/common/empty-state.tsx src/components/layout/top-toolbar.tsx src/components/layout/app-shell.tsx src/components/network/network-row-badges.tsx src/components/network/network-table.tsx src/app/page.tsx tests/components/network-table.test.tsx tests/app/home-page.test.tsx
git commit -m "feat: add split workspace shell and network table"
```

## Task 7: Add the detail panel and timeline view

**Files:**
- Create: `src/components/common/code-block.tsx`
- Create: `src/components/common/json-viewer.tsx`
- Create: `src/components/detail/request-summary-card.tsx`
- Create: `src/components/detail/detail-tabs.tsx`
- Create: `src/components/detail/request-tab.tsx`
- Create: `src/components/detail/response-tab.tsx`
- Create: `src/components/detail/tools-tab.tsx`
- Create: `src/components/detail/diff-tab.tsx`
- Create: `src/components/detail/timeline-context-tab.tsx`
- Create: `src/components/timeline/timeline-node.tsx`
- Create: `src/components/timeline/timeline-view.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Test: `tests/components/detail-tabs.test.tsx`

- [ ] **Step 1: Write the failing detail-panel test**

```tsx
// tests/components/detail-tabs.test.tsx
import { render, screen } from '@testing-library/react'
import { DetailTabs } from '@/components/detail/detail-tabs'

const request = {
  id: 'request-1',
  index: 1,
  pathname: '/v1/messages',
  body: { model: 'claude-sonnet-4-6', system: 'You are Claude Code', messages: [] },
  rawRequestText: '{"messages":[]}',
  rawResponseText: 'event: message_stop',
  sseEvents: [{ event: 'message_stop', rawData: '{}', data: {}, seq: 1 }],
  reconstructedMessage: {
    role: 'assistant',
    stopReason: 'tool_use',
    content: [{ type: 'tool_use', id: 'toolu_1', name: 'WebSearch', input: { query: 'docs' }, inputText: '{"query":"docs"}' }],
  },
} as any

const classification = { stepType: 'tool_call', confidence: 0.99, reasons: ['assistant emitted tool_use content'], toolCalls: [{ name: 'WebSearch' }] } as any
const diff = { summaryLines: ['Tool definitions changed.'] } as any
const turns = [{ id: 'turn-1', steps: [{ id: 'step-request-1', requestId: 'request-1', type: 'tool_call', title: 'tool call', summary: 'assistant emitted tool_use content', toolNames: ['WebSearch'], startedAt: 1 }] }] as any

describe('DetailTabs', () => {
  it('renders overview, tools, diff, and timeline context tabs for the selected request', () => {
    render(<DetailTabs request={request} classification={classification} diff={diff} turns={turns} />)

    expect(screen.getByText('Request #1')).toBeInTheDocument()
    expect(screen.getByText('assistant emitted tool_use content')).toBeInTheDocument()
    expect(screen.getByText('WebSearch')).toBeInTheDocument()
    expect(screen.getByText('Tool definitions changed.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the detail-panel test to verify it fails**

Run:
```bash
npm test -- tests/components/detail-tabs.test.tsx
```

Expected: FAIL with missing detail components.

- [ ] **Step 3: Implement the summary card, tabs, timeline components, and wire them into the shell**

```tsx
// src/components/common/code-block.tsx
export function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">{code}</pre>
}
```

```tsx
// src/components/common/json-viewer.tsx
export function JsonViewer({ value }: { value: unknown }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">{JSON.stringify(value, null, 2)}</pre>
}
```

```tsx
// src/components/detail/request-summary-card.tsx
import { buildRequestSummaryCardVM } from '@/features/semantic/build-summary-card'

export function RequestSummaryCard({ request, classification, diff }: any) {
  const card = buildRequestSummaryCardVM(request, classification, diff)

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-xl font-semibold">{card.title}</h2>
      <p className="mt-1 text-sm text-slate-400">{card.subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {card.toolBadges.map((tool) => (
          <span key={tool} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">{tool}</span>
        ))}
      </div>
      <ul className="mt-4 space-y-1 text-sm text-slate-300">
        {card.semanticReasons.map((reason) => (
          <li key={reason}>• {reason}</li>
        ))}
        {card.diffHighlights.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </section>
  )
}
```

```tsx
// src/components/detail/request-tab.tsx
import { JsonViewer } from '@/components/common/json-viewer'

export function RequestTab({ request }: any) {
  return <JsonViewer value={{ body: request.body, headers: request.requestHeaders, raw: request.rawRequestText }} />
}
```

```tsx
// src/components/detail/response-tab.tsx
import { JsonViewer } from '@/components/common/json-viewer'

export function ResponseTab({ request }: any) {
  return <JsonViewer value={{ sseEvents: request.sseEvents, reconstructedMessage: request.reconstructedMessage, raw: request.rawResponseText }} />
}
```

```tsx
// src/components/detail/tools-tab.tsx
export function ToolsTab({ classification, request }: any) {
  return (
    <div className="space-y-3">
      {classification.toolCalls.map((tool: any) => {
        const block = request.reconstructedMessage?.content.find((item: any) => item.type === 'tool_use' && item.name === tool.name)
        return (
          <article key={tool.name} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="font-medium text-slate-100">{tool.name}</h3>
            <pre className="mt-2 overflow-x-auto text-xs text-slate-300">{JSON.stringify(block?.input ?? {}, null, 2)}</pre>
          </article>
        )
      })}
    </div>
  )
}
```

```tsx
// src/components/detail/diff-tab.tsx
export function DiffTab({ diff }: any) {
  return (
    <ul className="space-y-2 text-sm text-slate-300">
      {diff.summaryLines.map((line: string) => (
        <li key={line}>• {line}</li>
      ))}
    </ul>
  )
}
```

```tsx
// src/components/detail/timeline-context-tab.tsx
export function TimelineContextTab({ turns, requestId }: any) {
  const turn = turns.find((item: any) => item.steps.some((step: any) => step.requestId === requestId))
  return (
    <div className="space-y-2 text-sm text-slate-300">
      {turn?.steps.map((step: any) => (
        <div key={step.id} className="rounded border border-slate-800 bg-slate-950/50 p-3">
          <div className="font-medium text-slate-100">{step.type}</div>
          <div>{step.summary}</div>
        </div>
      ))}
    </div>
  )
}
```

```tsx
// src/components/detail/detail-tabs.tsx
import { RequestSummaryCard } from './request-summary-card'
import { RequestTab } from './request-tab'
import { ResponseTab } from './response-tab'
import { ToolsTab } from './tools-tab'
import { DiffTab } from './diff-tab'
import { TimelineContextTab } from './timeline-context-tab'

export function DetailTabs({ request, classification, diff, turns }: any) {
  return (
    <div className="space-y-4">
      <RequestSummaryCard request={request} classification={classification} diff={diff} />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4"><RequestTab request={request} /></section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4"><ResponseTab request={request} /></section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4"><ToolsTab classification={classification} request={request} /></section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4"><DiffTab diff={diff} /></section>
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4"><TimelineContextTab turns={turns} requestId={request.id} /></section>
    </div>
  )
}
```

```tsx
// src/components/timeline/timeline-node.tsx
export function TimelineNode({ step }: { step: any }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{step.type}</div>
      <div className="mt-1 text-sm text-slate-100">{step.summary}</div>
    </div>
  )
}
```

```tsx
// src/components/timeline/timeline-view.tsx
import { TimelineNode } from './timeline-node'

export function TimelineView({ turns }: { turns: any[] }) {
  return (
    <div className="space-y-6">
      {turns.map((turn) => (
        <section key={turn.id} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{turn.id}</h3>
          {turn.steps.map((step: any) => (
            <TimelineNode key={step.id} step={step} />
          ))}
        </section>
      ))}
    </div>
  )
}
```

```tsx
// update src/components/layout/app-shell.tsx (replace return body)
import { DetailTabs } from '@/components/detail/detail-tabs'
import { TimelineView } from '@/components/timeline/timeline-view'

// inside AppShell after rows memo:
const selectedRequest = session?.requests.find((request) => request.id === selectedRequestId) ?? rows[0]
const selectedClassification = selectedRequest ? session?.classified.find((item) => item.requestId === selectedRequest.id) : null
const selectedDiff = selectedRequest ? session?.diffs[selectedRequest.id].summary : null

// replace the final JSX block with:
return (
  <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <TopToolbar
        onFileChange={(file) => file && loadHar(file)}
        search={search}
        onSearchChange={setSearch}
        stepType={stepType}
        onStepTypeChange={(value) => setStepType(value as any)}
        leftPaneMode={leftPaneMode}
        onLeftPaneModeChange={setLeftPaneMode}
        stats={session?.stats}
      />
      {!session ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            {leftPaneMode === 'network' ? (
              <NetworkTable rows={rows} selectedRequestId={selectedRequest?.id ?? null} onSelect={selectRequest} />
            ) : (
              <TimelineView turns={session.turns} />
            )}
          </div>
          <div>
            {selectedRequest && selectedClassification && selectedDiff ? (
              <DetailTabs request={selectedRequest} classification={selectedClassification} diff={selectedDiff} turns={session.turns} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </div>
  </main>
)
```

- [ ] **Step 4: Run the detail-panel test and the full test suite**

Run:
```bash
npm test -- tests/components/detail-tabs.test.tsx
npm test
npm run build
```

Expected:
- detail-tabs test PASS
- full suite PASS
- build succeeds with the split workspace, detail panel, and timeline view wired together

- [ ] **Step 5: Commit the detail and timeline experience**

Run:
```bash
git add src/components/common/code-block.tsx src/components/common/json-viewer.tsx src/components/detail/request-summary-card.tsx src/components/detail/detail-tabs.tsx src/components/detail/request-tab.tsx src/components/detail/response-tab.tsx src/components/detail/tools-tab.tsx src/components/detail/diff-tab.tsx src/components/detail/timeline-context-tab.tsx src/components/timeline/timeline-node.tsx src/components/timeline/timeline-view.tsx src/components/layout/app-shell.tsx tests/components/detail-tabs.test.tsx
git commit -m "feat: add request detail and timeline views"
```

## Task 8: Final verification and MVP hardening

**Files:**
- Modify: `src/features/parsing/parse-anthropic-request.ts`
- Modify: `src/features/sessions/build-analysis-session.ts`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `tests/features/parsing/parse-har.test.ts`
- Modify: `tests/features/parsing/parse-anthropic-sse.test.ts`

- [ ] **Step 1: Add a failing regression test for invalid request JSON and malformed SSE chunks**

```ts
// append to tests/features/parsing/parse-har.test.ts
it('returns a null body when the request payload is invalid JSON', () => {
  const harText = JSON.stringify({
    log: {
      entries: [
        {
          startedDateTime: '2026-04-01T10:00:00.000Z',
          time: 100,
          request: { method: 'POST', url: 'https://api.anthropic.com/v1/messages', postData: { text: '{invalid json' } },
          response: { status: 200, content: { text: '' } },
        },
      ],
    },
  })

  const result = extractClaudeEntries(parseHarText(harText))
  expect(result[0].body).toBeNull()
})
```

```ts
// append to tests/features/parsing/parse-anthropic-sse.test.ts
it('keeps raw tool input text when partial json never becomes valid', () => {
  const events = parseAnthropicSse('event: content_block_start\ndata: {"index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"WebSearch","input":{}}}\n\nevent: content_block_delta\ndata: {"index":0,"delta":{"type":"input_json_delta","partial_json":"{\"query\":"}}')
  const message = reconstructAssistantMessage(events)

  expect(message.content[0]).toEqual({
    type: 'tool_use',
    id: 'toolu_1',
    name: 'WebSearch',
    input: '{"query":',
    inputText: '{"query":',
  })
})
```

- [ ] **Step 2: Run the regression tests to verify they fail**

Run:
```bash
npm test -- tests/features/parsing/parse-har.test.ts tests/features/parsing/parse-anthropic-sse.test.ts
```

Expected: FAIL because invalid JSON currently throws.

- [ ] **Step 3: Implement the minimal hardening needed for MVP**

```ts
// update src/features/parsing/parse-anthropic-request.ts
import { AnthropicMessagesRequest } from '@/lib/models/normalized'

export function parseAnthropicRequestBody(raw: string | undefined): AnthropicMessagesRequest | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AnthropicMessagesRequest
    return parsed && Array.isArray(parsed.messages) ? parsed : null
  } catch {
    return null
  }
}
```

```ts
// update src/features/sessions/build-analysis-session.ts (inside requests map)
const sseEvents = request.rawResponseText ? parseAnthropicSse(request.rawResponseText) : []
const reconstructedMessage = sseEvents.length > 0 ? reconstructAssistantMessage(sseEvents) : undefined
```

```tsx
// update src/components/layout/app-shell.tsx (inside TopToolbar props)
onFileChange={(file) => {
  if (!file) return
  void loadHar(file)
}}
```

- [ ] **Step 4: Run the full verification suite**

Run:
```bash
npm test
npm run lint
npm run build
```

Expected:
- all tests PASS
- lint exits 0
- production build succeeds

- [ ] **Step 5: Commit the MVP-ready hardening**

Run:
```bash
git add src/features/parsing/parse-anthropic-request.ts src/features/sessions/build-analysis-session.ts src/components/layout/app-shell.tsx tests/features/parsing/parse-har.test.ts tests/features/parsing/parse-anthropic-sse.test.ts
git commit -m "fix: harden mvp parsing workflow"
```

## Spec Coverage Check

- SSE parsing and reconstruction: covered by Tasks 2-3 and Task 8 regression hardening.
- Claude request filtering and request-body parsing: covered by Task 2.
- Step classification, tool highlighting, timeline rebuilding, and summary cards: covered by Tasks 4 and 7.
- Automatic diff summaries: covered by Task 4 and rendered in Tasks 6-7.
- Split Network + Agent UI with request details: covered by Tasks 6-7.
- Pure frontend/local-first delivery: preserved throughout; no backend tasks introduced.
- Deferred by design because the approved spec placed them in later phases: manual two-request diff selection, IndexedDB caching, virtualization, true worker offloading from the UI path, and larger-file optimization beyond the MVP-ready guardrails.

## Self-Review

- Placeholder scan: no `TODO`, `TBD`, or “implement later” markers remain.
- Type consistency: `NormalizedClaudeRequest`, `AnthropicSseEvent`, `ReconstructedAssistantMessage`, `ClassifiedRequest`, `ConversationTurn`, and `RequestDiffSummary` names are used consistently across tasks after adding parsed-response fields to the normalized request shape.
- Scope check: the plan stays inside the approved MVP boundary and explicitly leaves phase-3/4 features out of the execution scope.
