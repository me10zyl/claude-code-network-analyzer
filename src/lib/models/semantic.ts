export type AgentStepType =
  | 'user_prompt'
  | 'planning'
  | 'tool_call'
  | 'observation'
  | 'final_answer'
  | 'mixed'
  | 'unknown'

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
  stopReason?: string | null
  diffHighlights: string[]
  semanticReasons: string[]
}
