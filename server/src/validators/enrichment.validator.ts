import { z } from 'zod'

/**
 * Run enrichment request schema
 */
export const runEnrichmentSchema = z.object({
  prospect_ids: z.array(z.string().uuid()).min(1, 'At least one prospect ID required'),
  batch_size: z.number().min(1).max(100).default(25),
})

export type RunEnrichmentInput = z.infer<typeof runEnrichmentSchema>

/**
 * Manual override schema
 */
export const manualOverrideSchema = z.object({
  company_type: z.string().optional(),
  ccc_verticals: z.array(z.string()).optional(),
  target_roles: z.array(z.string()).optional(),
  relevance_score: z.number().min(0).max(100).optional(),
  ai_summary: z.string().max(2000).optional(),
})

export type ManualOverrideInput = z.infer<typeof manualOverrideSchema>
