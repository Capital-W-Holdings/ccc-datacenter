import { z } from 'zod'

const ScraperTypes = ['conference', 'directory', 'news', 'company', 'cre_deal', 'ai_research'] as const
const PaginationTypes = ['page', 'scroll', 'load_more'] as const

/**
 * Scraper configuration schema
 */
export const scraperConfigSchema = z.object({
  urls: z.array(z.string().url()).default([]),
  keywords: z.array(z.string()).default([]),
  selectors: z.record(z.string()).optional(),
  pagination: z
    .object({
      type: z.enum(PaginationTypes).default('page'),
      max_pages: z.number().min(1).max(100).default(10),
    })
    .optional(),
})

export type ScraperConfig = z.infer<typeof scraperConfigSchema>

/**
 * Schema for creating a new scraper
 */
export const createScraperSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ScraperTypes),
  description: z.string().max(500).optional(),
  config: scraperConfigSchema.default({}),
  is_active: z.boolean().default(false),
})

export type CreateScraperInput = z.infer<typeof createScraperSchema>

/**
 * Schema for updating scraper config
 */
export const updateScraperConfigSchema = scraperConfigSchema

/**
 * Schema for toggling scraper
 */
export const toggleScraperSchema = z.object({
  is_active: z.boolean(),
})

/**
 * Schema for running a scraper
 */
export const runScraperSchema = z.object({
  max_pages: z.number().min(1).max(100).optional(),
  keywords: z.array(z.string()).optional(),
})

export type RunScraperInput = z.infer<typeof runScraperSchema>

/**
 * Job ID parameter
 */
export const jobIdParamSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
})
