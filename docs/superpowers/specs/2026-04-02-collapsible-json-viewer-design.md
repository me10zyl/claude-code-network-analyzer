# Collapsible JSON Viewer Design

- Date: 2026-04-02
- Scope: JSON folding for parsed request and reconstructed response panels
- Status: approved for planning

## Goal

Add property-level folding to the JSON views shown in the request and response detail tabs so large parsed payloads can be inspected without losing context.

This applies only to:

- `Parsed request body`
- `Reconstructed assistant message`

It does **not** apply to:

- `Raw request`
- `Raw response`

Those raw sections remain plain text code blocks.

## Current state

Today `src/components/common/json-viewer.tsx` just calls `JSON.stringify(value, null, 2)` and passes the result into `CodeBlock`. That makes parsed JSON readable, but every object and array is always fully expanded as static text with no interaction.

`RequestTab` and `ResponseTab` both rely on this shared `JsonViewer`, so the cleanest change is to upgrade that shared component rather than introducing a second JSON display path.

## Chosen approach

Use a recursive tree renderer inside `src/components/common/json-viewer.tsx`.

The component will:

- keep the existing public props: `title`, `value`, `emptyLabel`
- render primitives inline
- render objects and arrays as nested tree nodes
- allow only object and array nodes to be collapsed
- default all nodes to expanded on first render

This keeps the API stable for the existing detail tabs while upgrading the behavior in one place.

## Why this approach

### Chosen option: upgrade the existing `JsonViewer`

Pros:

- keeps changes localized to the shared JSON component
- avoids duplicate JSON presentation components
- preserves current call sites in `RequestTab` and `ResponseTab`
- makes future JSON folding reuse straightforward

Cons:

- requires custom recursive rendering and collapse state handling

### Rejected option: add a second collapsible JSON component

This would reduce change risk slightly, but the current `JsonViewer` is already a thin wrapper. Splitting it now would create unnecessary duplication and leave two overlapping JSON display paths in the repo.

### Rejected option: add a dependency for JSON tree rendering

This feature is small enough that a custom renderer is simpler than introducing a third-party package and adapting its styling to the existing UI.

## UX behavior

### Expansion model

- All nodes start expanded by default.
- A user can collapse any object or array node.
- Primitive values (`string`, `number`, `boolean`, `null`) are never collapsible.

### Scope of folding

- Object properties can be folded by collapsing the property value node when that value is an object or array.
- Array items can be folded when an item is an object or array.
- Empty objects and empty arrays should display compactly and should not create misleading nested expand affordances.

### Presentation

The viewer should stay aligned with the current dark theme and feel like part of the existing detail panel, not a separate embedded tool.

Visual structure should include:

- indentation for nested depth
- a lightweight expand/collapse control for objects and arrays
- clear key/value labeling for object properties
- compact bracketed previews for collapsed nodes, such as object and array item counts when useful

## Component design

## `JsonViewer`

Keep the top-level component API unchanged. It remains responsible for:

- title rendering
- empty-state handling
- delegating JSON rendering to recursive child nodes

## Recursive node renderer

Introduce an internal recursive renderer inside `json-viewer.tsx`.

Each node should determine whether the current value is:

- primitive
- array
- object

For object and array nodes, the renderer owns local expanded/collapsed state.

Recommended responsibilities:

- `JsonViewer`: framing, title, empty state
- internal node component: recursive rendering and collapse interaction

## Data handling rules

- Preserve property order from the original JavaScript object.
- Render arrays in index order.
- Treat `null` as a primitive value.
- Do not mutate the input value.
- Do not attempt to parse or reinterpret raw JSON strings in the raw request/response panels.

## Integration impact

### `src/components/detail/request-tab.tsx`

No behavioral changes beyond inheriting the upgraded `JsonViewer` for `Parsed request body`.

### `src/components/detail/response-tab.tsx`

No behavioral changes beyond inheriting the upgraded `JsonViewer` for `Reconstructed assistant message`.

### `src/components/common/code-block.tsx`

No change expected. Raw request and raw response continue to use the existing code block path.

## Testing strategy

Add focused component coverage for the upgraded JSON viewer.

Recommended test cases:

1. renders primitive and nested values in expanded form by default
2. collapses an object node when its toggle is clicked
3. collapses an array node when its toggle is clicked
4. preserves empty-state behavior when `value` is nullish
5. keeps raw request/response behavior unchanged by leaving `RequestTab` and `ResponseTab` call sites intact

## Out of scope

The following are intentionally excluded from this change:

- syntax highlighting for tree nodes
- search within JSON
- copy-path / copy-value controls
- depth-based default collapsing
- persisted expand/collapse state across tab switches
- folding of raw request or raw response text
