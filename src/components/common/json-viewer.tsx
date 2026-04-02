'use client'

import { memo, useState } from 'react'

interface JsonViewerProps {
  title?: string
  value: unknown
  emptyLabel?: string
}

interface JsonNodeProps {
  value: unknown
  depth: number
  path: string
  propertyName?: string
  arrayIndex?: number
  suffix?: string
}

const indentSize = 16
const eagerChildRenderLimit = 40
const deferredRenderChunkSize = 40
type JsonArray = unknown[]
type JsonObject = Record<string, unknown>

export function JsonViewer({ title, value, emptyLabel = 'No content' }: JsonViewerProps) {
  return (
    <section className="space-y-2">
      {title ? <h3 className="text-sm font-medium text-slate-200">{title}</h3> : null}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
        <div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-wide text-slate-500">json</div>
        {value == null ? (
          <div className="p-4 text-xs leading-6 text-slate-500">{emptyLabel}</div>
        ) : (
          <div className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-200">
            <JsonNode value={value} depth={0} path="root" />
          </div>
        )}
      </div>
    </section>
  )
}

const JsonNode = memo(function JsonNode({ value, depth, path, propertyName, arrayIndex, suffix = '' }: JsonNodeProps) {
  const kind = getJsonValueKind(value)

  if (kind === 'primitive') {
    return (
      <JsonPrimitiveNode
        value={value}
        depth={depth}
        propertyName={propertyName}
        arrayIndex={arrayIndex}
        suffix={suffix}
      />
    )
  }

  return (
    <JsonCollectionNode
      value={value}
      depth={depth}
      path={path}
      propertyName={propertyName}
      arrayIndex={arrayIndex}
      suffix={suffix}
      kind={kind}
    />
  )
})

interface JsonPrimitiveNodeProps {
  value: unknown
  depth: number
  propertyName?: string
  arrayIndex?: number
  suffix?: string
}

const JsonPrimitiveNode = memo(function JsonPrimitiveNode({
  value,
  depth,
  propertyName,
  arrayIndex,
  suffix = '',
}: JsonPrimitiveNodeProps) {
  const indent = { paddingLeft: `${depth * indentSize}px` }

  return (
    <div style={indent} className="break-words">
      <NodeLabel propertyName={propertyName} arrayIndex={arrayIndex} />
      <PrimitiveValue value={value} />
      <span className="text-slate-400">{suffix}</span>
    </div>
  )
})

interface JsonCollectionNodeProps extends JsonNodeProps {
  kind: 'array' | 'object'
}

const JsonCollectionNode = memo(function JsonCollectionNode({
  value,
  depth,
  path,
  propertyName,
  arrayIndex,
  suffix = '',
  kind,
}: JsonCollectionNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const indent = { paddingLeft: `${depth * indentSize}px` }

  const arrayValue = kind === 'array' ? (value as JsonArray) : null
  const objectValue = kind === 'object' ? (value as JsonObject) : null
  const objectEntries = objectValue ? Object.entries(objectValue) : []
  const children = arrayValue ?? objectEntries
  const shouldDeferChildren = children.length > eagerChildRenderLimit
  const [renderedChildCount, setRenderedChildCount] = useState(() =>
    shouldDeferChildren ? 0 : children.length,
  )

  if (children.length === 0) {
    return (
      <div style={indent} className="break-words">
        <NodeLabel propertyName={propertyName} arrayIndex={arrayIndex} />
        <span className="text-slate-300">{kind === 'array' ? '[]' : '{}'}</span>
        <span className="text-slate-400">{suffix}</span>
      </div>
    )
  }

  const opening = kind === 'array' ? '[' : '{'
  const closing = kind === 'array' ? ']' : '}'
  const childNoun = kind === 'array' ? 'item' : 'field'
  const summary = `${children.length} ${childNoun}${children.length === 1 ? '' : 's'}`
  const nodeName = propertyName ?? (arrayIndex != null ? `item ${arrayIndex}` : 'root')
  const visibleChildCount = shouldDeferChildren ? renderedChildCount : children.length
  const remainingChildCount = children.length - visibleChildCount
  const initialDeferredRenderCount = Math.min(children.length, deferredRenderChunkSize)
  const incrementalRenderCount = Math.min(remainingChildCount, deferredRenderChunkSize)

  function renderMoreChildren() {
    setRenderedChildCount((current) =>
      Math.min(children.length, Math.max(current + deferredRenderChunkSize, deferredRenderChunkSize)),
    )
  }

  return (
    <div>
      <div style={indent} className="flex items-start gap-2 break-words">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${nodeName}`}
          onClick={() => setExpanded((current) => !current)}
          className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-900 text-[10px] text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          {expanded ? '-' : '+'}
        </button>
        <div className="min-w-0 break-words">
          <NodeLabel propertyName={propertyName} arrayIndex={arrayIndex} />
          {expanded ? (
            <>
              <span className="text-slate-300">{opening}</span>
              <span className="text-slate-400">{suffix}</span>
            </>
          ) : (
            <>
              <span className="text-slate-300">{opening} </span>
              <span className="text-slate-500">{summary}</span>
              <span className="text-slate-300"> {closing}</span>
              <span className="text-slate-400">{suffix}</span>
            </>
          )}
        </div>
      </div>

      {/* Keep descendants mounted and only hide them when collapsed so toggling a large JSON branch
          does not force React to unmount and remount the entire subtree. */}
      <div hidden={!expanded} aria-hidden={!expanded}>
        {visibleChildCount === 0 ? (
          <DeferredChildrenControl
            depth={depth + 1}
            count={children.length}
            noun={childNoun}
            onRender={renderMoreChildren}
            actionLabel={`Render first ${initialDeferredRenderCount} ${childNoun}${initialDeferredRenderCount === 1 ? '' : 's'}`}
          />
        ) : arrayValue
          ? arrayValue.slice(0, visibleChildCount).map((item, index) => (
              <JsonNode
                key={`${path}[${index}]`}
                value={item}
                depth={depth + 1}
                path={`${path}[${index}]`}
                arrayIndex={index}
                suffix={index === children.length - 1 ? '' : ','}
              />
            ))
          : objectEntries.slice(0, visibleChildCount).map(([key, nestedValue], index) => (
              <JsonNode
                key={`${path}.${key}`}
                value={nestedValue}
                depth={depth + 1}
                path={`${path}.${key}`}
                propertyName={key}
                suffix={index === children.length - 1 ? '' : ','}
              />
            ))}
        {visibleChildCount > 0 && remainingChildCount > 0 ? (
          <DeferredChildrenControl
            depth={depth + 1}
            count={remainingChildCount}
            noun={childNoun}
            onRender={renderMoreChildren}
            actionLabel={`Render next ${incrementalRenderCount} ${childNoun}${incrementalRenderCount === 1 ? '' : 's'}`}
          />
        ) : null}
        <div style={indent} className="text-slate-300">
          {closing}
          <span className="text-slate-400">{suffix}</span>
        </div>
      </div>
    </div>
  )
})

interface DeferredChildrenControlProps {
  depth: number
  count: number
  noun: string
  onRender: () => void
  actionLabel?: string
}

function DeferredChildrenControl({ depth, count, noun, onRender, actionLabel }: DeferredChildrenControlProps) {
  return (
    <div style={{ paddingLeft: `${depth * indentSize}px` }} className="flex items-center gap-3 py-1 text-slate-400">
      <button
        type="button"
        onClick={onRender}
        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100"
      >
        {actionLabel ?? `Render ${count} ${noun}${count === 1 ? '' : 's'}`}
      </button>
      <span className="text-[11px] text-slate-500">{count} {noun}{count === 1 ? '' : 's'} deferred</span>
    </div>
  )
}

function NodeLabel({ propertyName, arrayIndex }: { propertyName?: string; arrayIndex?: number }) {
  if (propertyName != null) {
    return (
      <>
        <span className="text-sky-300">{JSON.stringify(propertyName)}</span>
        <span className="text-slate-500">: </span>
      </>
    )
  }

  if (arrayIndex != null) {
    return (
      <>
        <span className="text-violet-300">{arrayIndex}</span>
        <span className="text-slate-500">: </span>
      </>
    )
  }

  return null
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    const multiline = value.includes('\n') || value.includes('\r')
    const displayValue = multiline ? formatMultilineString(value) : JSON.stringify(value)

    return (
      <span className={multiline ? 'whitespace-pre-wrap break-words text-emerald-300' : 'text-emerald-300'}>
        {displayValue}
      </span>
    )
  }

  if (typeof value === 'number') {
    return <span className="text-amber-300">{String(value)}</span>
  }

  if (typeof value === 'boolean') {
    return <span className="text-fuchsia-300">{String(value)}</span>
  }

  return <span className="text-slate-500">null</span>
}

function formatMultilineString(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n')
  const escapedLines = normalized.split('\n').map((line) => JSON.stringify(line).slice(1, -1))

  return `"${escapedLines.join('\n')}"`
}

function getJsonValueKind(value: unknown): 'primitive' | 'array' | 'object' {
  if (Array.isArray(value)) {
    return 'array'
  }

  if (value != null && typeof value === 'object') {
    return 'object'
  }

  return 'primitive'
}
