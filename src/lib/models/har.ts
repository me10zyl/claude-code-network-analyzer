import { z } from 'zod'

export const harHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
})

export const harPostDataSchema = z
  .object({
    mimeType: z.string().optional(),
    text: z.string().optional(),
  })
  .optional()

export const harRequestSchema = z.object({
  method: z.string(),
  url: z.string(),
  headers: z.array(harHeaderSchema).default([]),
  postData: harPostDataSchema,
})

export const harContentSchema = z
  .object({
    size: z.number().optional(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
  })
  .default({})

export const harResponseSchema = z.object({
  status: z.number(),
  statusText: z.string().optional(),
  headers: z.array(harHeaderSchema).default([]),
  content: harContentSchema,
})

export const harEntrySchema = z.object({
  startedDateTime: z.string(),
  time: z.number(),
  request: harRequestSchema,
  response: harResponseSchema,
})

export const harSchema = z.object({
  log: z.object({
    version: z.string(),
    creator: z.object({
      name: z.string(),
      version: z.string(),
    }),
    entries: z.array(harEntrySchema).default([]),
  }),
})

export type HarHeader = z.infer<typeof harHeaderSchema>
export type HarEntry = z.infer<typeof harEntrySchema>
export type Har = z.infer<typeof harSchema>
