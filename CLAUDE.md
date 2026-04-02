# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Start the dev server: `npm run dev`
- Run the full test suite: `npm test`
- Run a single test file: `npm test -- tests/features/parsing/parse-har.test.ts`
- Run tests in watch mode: `npm run test:watch`
- Run lint: `npm run lint`
- Build for production: `npm run build`
- Start the production build locally: `npm run start`

## High-level architecture

This repo is a local-first Next.js app for inspecting Claude Code HAR exports. There is no backend analysis service: HAR ingestion, parsing, SSE reconstruction, semantic classification, timeline building, and diff generation all happen in the browser or a Web Worker fallback path.

### End-to-end analysis pipeline

The main analysis pipeline is:

`File upload -> read HAR text -> build analysis session -> store session -> render network/timeline/detail views`

Important files in that flow:

- `src/features/har-import/read-har-file.ts` reads the uploaded HAR file as text.
- `src/stores/session-store.ts` owns `loadHar()`, loading/error state, and Worker orchestration. It prefers `src/workers/parser.worker.ts` but falls back to in-thread parsing if Workers are unavailable.
- `src/workers/parser.worker.ts` is a thin wrapper around `buildAnalysisSession()`.
- `src/features/sessions/build-analysis-session.ts` is the central pipeline entry point. It turns raw HAR text into one `AnalysisSession` containing normalized requests, classifications, conversation turns, diff summaries, and top-level stats.

When changing parsing behavior, start from `build-analysis-session.ts` and trace outward.

### Parsing and normalization layers

The parser is intentionally split into protocol-oriented stages:

- `src/features/parsing/parse-har.ts` validates HAR JSON and extracts Claude-relevant request entries.
- `src/features/parsing/parse-anthropic-request.ts` parses Anthropic-style request bodies.
- `src/features/parsing/parse-anthropic-sse.ts` parses SSE response frames.
- `src/features/parsing/reconstruct-message.ts` rebuilds assistant output from SSE events, including `text` and `tool_use` content.
- `src/lib/models/har.ts` defines HAR schemas.
- `src/lib/models/normalized.ts` defines normalized request/SSE/message types.

`extractClaudeEntries()` is intentionally broader than `api.anthropic.com` only: it matches HTTPS `POST` requests whose pathname ends with `/v1/messages`, so Anthropic-compatible proxy endpoints are also analyzed.

### Semantic layer

After normalization, the app derives Claude Code workflow semantics:

- `src/features/semantic/classify-step.ts` labels each request as `planning`, `tool_call`, `observation`, `final_answer`, etc.
- `src/features/semantic/build-timeline.ts` groups requests into `ConversationTurn[]` and `TimelineStep[]`.
- `src/features/diff/diff-requests.ts` compares each request against the previous one and generates summary deltas.
- `src/features/semantic/build-summary-card.ts` converts raw request + semantic metadata into the right-side overview card view model.
- `src/lib/models/semantic.ts` defines the semantic contracts used across stores and UI.

If a UI change needs new semantics, prefer extending the semantic layer rather than teaching presentational components to inspect raw HAR/SSE structures directly.

### UI composition and state boundaries

The app shell is assembled in `src/components/layout/app-shell.tsx`, which connects stores to the three main UI surfaces:

- `TopToolbar` for upload, search, step filters, stats, and left-pane mode toggle
- `NetworkTable` for request-centric browsing
- `TimelineView` for workflow-centric browsing
- `DetailTabs` for the selected request detail panel

State is deliberately split across small Zustand stores:

- `src/stores/session-store.ts`: parsed session + loading/error + upload action
- `src/stores/filter-store.ts`: search text and semantic step filter
- `src/stores/selection-store.ts`: currently selected request id
- `src/stores/ui-store.ts`: left pane mode and active detail tab

A useful non-obvious detail: `AppShell` filters requests/classifications/diffs for the left pane, but the detail timeline tab still receives the full `session.turns` so the selected request keeps its full turn context even when filters are active.

### UI structure

The page entry is minimal:

- `src/app/page.tsx` only renders `AppShell`

The actual interface is split by responsibility:

- `src/components/layout/*` handles page orchestration and toolbar controls.
- `src/components/network/*` renders the request table and per-row semantic badges.
- `src/components/timeline/*` renders conversation-turn and step views.
- `src/components/detail/*` renders the right-side tabs: overview, request, response, tools, diff, and timeline context.
- `src/components/common/*` contains reusable display primitives such as code/json blocks and empty states.

### Tests

The tests are organized around the same layers as the app:

- `tests/features/parsing/*` covers HAR parsing, Anthropic request parsing behavior, and SSE reconstruction edge cases.
- `tests/features/semantic/*` covers workflow classification and timeline construction.
- `tests/features/diff/*` covers request diff summaries.
- `tests/features/sessions/*` covers the full session-building pipeline.
- `tests/components/*` covers major view components.
- `tests/app/home-page.test.tsx` is the main integration-style wiring test for store interactions, filtering, pane switching, and detail/timeline coordination.

If you change app-wide behavior in filtering, selection, or pane/detail coordination, update `tests/app/home-page.test.tsx` in addition to the lower-level unit tests.
