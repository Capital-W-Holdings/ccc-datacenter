import { z } from 'zod'

/**
 * Settings update schema
 */
export const updateSettingsSchema = z.object({
  anthropic_api_key: z.string().optional(),
  hunter_api_key: z.string().optional(),
  scraping_delay_ms: z.number().min(1000).max(30000).optional(),
  enrichment_batch_size: z.number().min(1).max(100).optional(),
  auto_enrich_on_import: z.boolean().optional(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
