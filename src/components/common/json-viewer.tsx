import { CodeBlock } from '@/components/common/code-block'

interface JsonViewerProps {
  title?: string
  value: unknown
  emptyLabel?: string
}

export function JsonViewer({ title, value, emptyLabel }: JsonViewerProps) {
  const code = value == null ? '' : JSON.stringify(value, null, 2)

  return <CodeBlock title={title} code={code} language="json" emptyLabel={emptyLabel} />
}
