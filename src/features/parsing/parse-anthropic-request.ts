import { z } from 'zod'

import type { AnthropicMessagesRequest } from '@/lib/models/normalized'

const anthropicMessagesRequestSchema = z.object({
  model: z.string().optional(),
  max_tokens: z.number().optional(),
  thinking: z.unknown().optional(),
  messages: z.array(
    z.object({
      role: z.string(),
      content: z.unknown(),
    }),
  ),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        input_schema: z.unknown().optional(),
      }),
    )
    .optional(),
})

export function parseAnthropicRequestBody(raw: string | undefined): AnthropicMessagesRequest | null {
  if (!raw) {
    return null
  }

  try {
    return anthropicMessagesRequestSchema.parse(JSON.parse(raw)) as AnthropicMessagesRequest
  } catch {
    return null
  }
}
