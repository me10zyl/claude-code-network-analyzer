# Claude Code Network Analyzer

A local-first web app for analyzing Claude Code HAR exports and reconstructing the agent workflow behind each `/v1/messages` request.

## What it does

Given a HAR file exported from Reqable, the app:

- extracts Claude-compatible `POST .../v1/messages` requests
- parses Anthropic-style request bodies and SSE responses
- reconstructs assistant output, including `text` and `tool_use`
- classifies each request into workflow steps such as `planning`, `tool_call`, `observation`, and `final_answer`
- builds a conversation timeline across requests
- generates request-to-request diff summaries for tools, messages, and assistant output changes

The app runs entirely on the client. HAR loading, parsing, semantic analysis, and view-model generation happen in the browser, with a Web Worker path for session parsing.

## Current UI

The MVP is organized as a dual-pane workspace:

- **Top toolbar**: HAR upload, search, step-type filter, left-pane mode toggle, session stats
- **Left pane**:
  - **Network** view for request-by-request inspection
  - **Timeline** view for workflow-oriented browsing
- **Right pane**: request detail tabs for Overview, Request, Response, Tools, Diff, and Timeline context

## Supported input

Current input target:

- Reqable-exported HAR files

The request extractor is not limited to `api.anthropic.com`; it also supports Anthropic-compatible proxy endpoints as long as the request is:

- `https`
- `POST`
- pathname ending in `/v1/messages`

## Getting started

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open the local Next.js URL shown in the terminal.

## Commands

```bash
npm run dev        # start development server
npm test           # run all tests
npm test -- tests/features/parsing/parse-har.test.ts   # run one test file
npm run test:watch # run Vitest in watch mode
npm run lint       # run ESLint
npm run build      # production build
npm run start      # run the production build locally
```

## Architecture overview

The main pipeline is:

```text
Upload HAR
  -> read file text
  -> parse HAR entries
  -> extract Claude request records
  -> parse SSE responses
  -> reconstruct assistant message
  -> classify workflow step
  -> build conversation timeline
  -> generate diff summaries
  -> render Network + Timeline + Detail views
```

Key layers:

### 1. Ingestion and session orchestration

- `src/features/har-import/read-har-file.ts` reads the uploaded file as text.
- `src/stores/session-store.ts` owns upload, loading/error state, and session creation.
- `src/workers/parser.worker.ts` runs `buildAnalysisSession()` off the main thread when Workers are available.
- `src/features/sessions/build-analysis-session.ts` is the central entry point that produces one `AnalysisSession` for the whole UI.

### 2. Parsing and normalization

- `src/features/parsing/parse-har.ts` validates HAR JSON and extracts Claude-relevant requests.
- `src/features/parsing/parse-anthropic-request.ts` parses request payloads.
- `src/features/parsing/parse-anthropic-sse.ts` parses response SSE frames.
- `src/features/parsing/reconstruct-message.ts` reconstructs assistant output from SSE events.
- `src/lib/models/har.ts` and `src/lib/models/normalized.ts` define the transport-layer types.

### 3. Semantic analysis

- `src/features/semantic/classify-step.ts` derives workflow step types.
- `src/features/semantic/build-timeline.ts` groups requests into conversation turns.
- `src/features/diff/diff-requests.ts` compares each request with the previous request.
- `src/features/semantic/build-summary-card.ts` creates the overview card view model.
- `src/lib/models/semantic.ts` defines the semantic contracts shared by analysis and UI.

### 4. UI and state

- `src/components/layout/app-shell.tsx` wires the whole page together.
- `src/components/network/*` renders the request table.
- `src/components/timeline/*` renders turn and step navigation.
- `src/components/detail/*` renders the right-side detail tabs.
- Zustand stores in `src/stores/*` split state into session, filter, selection, and UI concerns.

A notable detail in the current implementation: the left pane can be filtered, but the detail timeline tab still receives the full `session.turns`, so selecting a request preserves full turn context even when filters are active.

## Tests

The test suite mirrors the architecture:

- `tests/features/parsing/*` for HAR/request/SSE parsing
- `tests/features/semantic/*` for classification and timeline logic
- `tests/features/diff/*` for diff summaries
- `tests/features/sessions/*` for the full analysis pipeline
- `tests/components/*` for major UI components
- `tests/app/home-page.test.tsx` for store wiring, filtering, pane switching, and detail coordination

## Current scope

Included in the current MVP:

- local-only HAR analysis
- Claude workflow reconstruction from Anthropic-style `/v1/messages` traffic
- network and timeline views
- semantic request classification
- automatic per-request diff summaries

Not implemented in the current repo state:

- backend persistence or cloud sync
- multi-session merge analysis
- manual arbitrary request-to-request diff selection
- report export
