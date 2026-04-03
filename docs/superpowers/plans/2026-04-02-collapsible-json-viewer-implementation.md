# Collapsible JSON Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add property-level folding to the parsed request body and reconstructed assistant message JSON panels while keeping raw request and raw response as plain text blocks.

**Architecture:** Upgrade `src/components/common/json-viewer.tsx` from a `JSON.stringify` wrapper into a recursive tree renderer with local expand/collapse state on object and array nodes. Keep `RequestTab` and `ResponseTab` using the same `JsonViewer` API so the change stays isolated to the shared JSON presentation layer and its focused tests.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library

---

## File Structure

### Shared JSON display
- Modify: `src/components/common/json-viewer.tsx` — replace static pretty-printed JSON with recursive tree rendering and per-node collapse state
- Reuse: `src/components/common/code-block.tsx` — keep raw request/response rendering unchanged

### Detail integration
- Reuse: `src/components/detail/request-tab.tsx` — continue rendering `Parsed request body` through `JsonViewer` without changing raw request handling
- Reuse: `src/components/detail/response-tab.tsx` — continue rendering `Reconstructed assistant message` through `JsonViewer` without changing raw response handling

### Tests
- Create: `tests/components/json-viewer.test.tsx` — verify default expansion, collapsing object and array nodes, and nullish empty-state behavior
- Modify: `tests/components/detail-tabs.test.tsx` — verify request/response tabs still render raw blocks while inheriting the upgraded parsed JSON viewer behavior

## Task 1: Add focused failing tests for the JSON tree viewer

**Files:**
- Create: `tests/components/json-viewer.test.tsx`
- Test against: `src/components/common/json-viewer.tsx`

- [ ] **Step 1: Write the failing component tests for expanded and collapsible JSON nodes**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { JsonViewer } from '@/components/common/json-viewer'

describe('JsonViewer', () => {
  it('renders nested object values expanded by default', () => {
    render(
      <JsonViewer
        title="Parsed request body"
        value={{
          model: 'claude-sonnet-4-5',
          tools: [{ name: 'WebSearch' }],
        }}
      />,
    )

    expect(screen.getByText('Parsed request body')).toBeInTheDocument()
    expect(screen.getByText('model')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet-4-5')).toBeInTheDocument()
    expect(screen.getByText('tools')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('WebSearch')).toBeInTheDocument()
  })

  it('collapses an object node when its toggle is clicked', async () => {
    const user = userEvent.setup()

    render(
      <JsonViewer
        value={{
          input_schema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
          },
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Collapse input_schema' }))

    expect(screen.queryByText('properties')).not.toBeInTheDocument()
    expect(screen.queryByText('query')).not.toBeInTheDocument()
    expect(screen.getByText('{2 keys}')).toBeInTheDocument()
  })

  it('collapses an array node when its toggle is clicked', async () => {
    const user = userEvent.setup()

    render(
      <JsonViewer
        value={{
          content: [
            { type: 'tool_use', name: 'WebSearch' },
            { type: 'text', text: 'done' },
          ],
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Collapse content' }))

    expect(screen.queryByText('tool_use')).not.toBeInTheDocument()
    expect(screen.queryByText('WebSearch')).not.toBeInTheDocument()
    expect(screen.getByText('[2 items]')).toBeInTheDocument()
  })

  it('shows the empty label when the value is nullish', () => {
    render(<JsonViewer title="Parsed request body" value={null} emptyLabel="No parsed request body" />)

    expect(screen.getByText('No parsed request body')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the new JSON viewer test file to verify it fails**

Run: `npm test -- tests/components/json-viewer.test.tsx`
Expected: FAIL because `JsonViewer` currently renders static text through `CodeBlock`, so collapse buttons like `Collapse input_schema` and `Collapse content` do not exist.

- [ ] **Step 3: Commit the failing test scaffold**

```bash
git add tests/components/json-viewer.test.tsx
git commit -m "test: define collapsible json viewer behavior"
```

## Task 2: Implement the recursive collapsible JSON viewer

**Files:**
- Modify: `src/components/common/json-viewer.tsx`
- Test: `tests/components/json-viewer.test.tsx`

- [ ] **Step 1: Replace the static JSON stringify wrapper with a recursive renderer**

```tsx
import { useState } from 'react'

interface JsonViewerProps {
  title?: string
  value: unknown
  emptyLabel?: string
}

export function JsonViewer({ title, value, emptyLabel = 'No content' }: JsonViewerProps) {
  if (value == null) {
    return (
      <section className="space-y-2">
        {title ? <h3 className="text-sm font-medium text-slate-200">{title}</h3> : null}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs leading-6 text-slate-400">
          {emptyLabel}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      {title ? <h3 className="text-sm font-medium text-slate-200">{title}</h3> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-slate-200">
        <JsonNode value={value} label={null} depth={0} />
      </div>
    </section>
  )
}

function JsonNode({ value, label, depth }: { value: unknown; label: string | null; depth: number }) {
  if (value === null || typeof value !== 'object') {
    return (
      <div style={{ paddingLeft: depth * 16 }} className="break-all">
        {label ? <span className="mr-2 text-slate-400">{label}:</span> : null}
        <span className="text-emerald-300">{formatPrimitive(value)}</span>
      </div>
    )
  }

  if (Array.isArray(value)) {
    return <JsonArrayNode value={value} label={label} depth={depth} />
  }

  return <JsonObjectNode value={value as Record<string, unknown>} label={label} depth={depth} />
}

function JsonObjectNode({
  value,
  label,
  depth,
}: {
  value: Record<string, unknown>
  label: string | null
  depth: number
}) {
  const entries = Object.entries(value)
  const [expanded, setExpanded] = useState(true)
  const canCollapse = entries.length > 0

  return (
    <div>
      <div style={{ paddingLeft: depth * 16 }} className="flex items-start gap-2">
        {canCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-0.5 rounded text-slate-400 hover:text-slate-200"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label ?? 'object'}`}
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <div>
          {label ? <span className="mr-2 text-slate-400">{label}:</span> : null}
          <span className="text-slate-300">{expanded || !canCollapse ? '{' : `{${entries.length} key${entries.length === 1 ? '' : 's'}}`}</span>
        </div>
      </div>
      {expanded
        ? entries.map(([key, childValue]) => <JsonNode key={key} value={childValue} label={key} depth={depth + 1} />)
        : null}
      {expanded ? (
        <div style={{ paddingLeft: depth * 16 + 20 }} className="text-slate-300">
          {'}'}
        </div>
      ) : null}
    </div>
  )
}

function JsonArrayNode({
  value,
  label,
  depth,
}: {
  value: unknown[]
  label: string | null
  depth: number
}) {
  const [expanded, setExpanded] = useState(true)
  const canCollapse = value.length > 0

  return (
    <div>
      <div style={{ paddingLeft: depth * 16 }} className="flex items-start gap-2">
        {canCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-0.5 rounded text-slate-400 hover:text-slate-200"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label ?? 'array'}`}
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <div>
          {label ? <span className="mr-2 text-slate-400">{label}:</span> : null}
          <span className="text-slate-300">{expanded || !canCollapse ? '[' : `[${value.length} items]`}</span>
        </div>
      </div>
      {expanded ? value.map((childValue, index) => <JsonNode key={index} value={childValue} label={String(index)} depth={depth + 1} />) : null}
      {expanded ? (
        <div style={{ paddingLeft: depth * 16 + 20 }} className="text-slate-300">
          {']'}
        </div>
      ) : null}
    </div>
  )
}

function formatPrimitive(value: unknown) {
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  return String(value)
}
```

- [ ] **Step 2: Run the focused JSON viewer tests and make them pass**

Run: `npm test -- tests/components/json-viewer.test.tsx`
Expected: PASS with 4 passing tests.

- [ ] **Step 3: Commit the shared viewer implementation**

```bash
git add src/components/common/json-viewer.tsx tests/components/json-viewer.test.tsx
git commit -m "feat: add collapsible json viewer"
```

## Task 3: Verify detail-tab integration and unchanged raw blocks

**Files:**
- Modify: `tests/components/detail-tabs.test.tsx`
- Reuse: `src/components/detail/request-tab.tsx`
- Reuse: `src/components/detail/response-tab.tsx`

- [ ] **Step 1: Extend the detail tabs test to verify parsed JSON folding and raw block stability**

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DetailTabs } from '@/components/detail/detail-tabs'
import type { NormalizedClaudeRequest } from '@/lib/models/normalized'
import type { ClassifiedRequest, ConversationTurn, RequestDiffSummary } from '@/lib/models/semantic'
import { useUiStore } from '@/stores/ui-store'

// keep the existing createRequest/createClassification/createDiff/createTurns helpers

describe('DetailTabs', () => {
  beforeEach(() => {
    useUiStore.setState({ leftPaneMode: 'requests', activeDetailTab: 'summary' })
  })

  it('shows collapsible parsed JSON while leaving raw request and raw response as code blocks', async () => {
    const user = userEvent.setup()

    render(
      <DetailTabs
        request={createRequest()}
        classified={createClassification()}
        diff={createDiff()}
        turns={createTurns()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Request' }))

    expect(screen.getByRole('button', { name: 'Collapse tools' })).toBeInTheDocument()
    expect(screen.getByText('Raw request')).toBeInTheDocument()
    expect(screen.getByText('{\n  "body": "request"\n}')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse tools' }))
    expect(screen.getByText('[1 items]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Response' }))

    expect(screen.getByRole('button', { name: 'Collapse content' })).toBeInTheDocument()
    expect(screen.getByText('Raw response')).toBeInTheDocument()
    expect(screen.getByText('{\n  "body": "response"\n}')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the detail tabs test to verify the request/response integration**

Run: `npm test -- tests/components/detail-tabs.test.tsx`
Expected: PASS with the existing tab-switching test plus the new folding integration test.

- [ ] **Step 3: Commit the integration coverage**

```bash
git add tests/components/detail-tabs.test.tsx
git commit -m "test: cover collapsible json in detail tabs"
```

## Task 4: Run final verification and prepare branch state

**Files:**
- Verify: `src/components/common/json-viewer.tsx`
- Verify: `tests/components/json-viewer.test.tsx`
- Verify: `tests/components/detail-tabs.test.tsx`

- [ ] **Step 1: Run the targeted component tests together**

Run: `npm test -- tests/components/json-viewer.test.tsx tests/components/detail-tabs.test.tsx`
Expected: PASS with both files green.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS with all test files green.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS with no ESLint errors.

- [ ] **Step 4: Commit the final verified state**

```bash
git add src/components/common/json-viewer.tsx tests/components/json-viewer.test.tsx tests/components/detail-tabs.test.tsx
git commit -m "feat: support folding parsed json panels"
```
