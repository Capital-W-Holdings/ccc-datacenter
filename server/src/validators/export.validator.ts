import { z } from 'zod'

const ExportFormats = ['xlsx', 'csv', 'pdf'] as const

/**
 * Export request schema
 */
export const createExportSchema = z.object({
  format: z.enum(ExportFormats).default('xlsx'),
  name: z.string().max(200).optional(),
  filters: z
    .object({
      search: z.string().optional(),
      statuses: z.array(z.string()).optional(),
      company_types: z.array(z.string()).optional(),
      verticals: z.array(z.string()).optional(),
      target_roles: z.array(z.string()).optional(),
      score_min: z.number().min(0).max(100).optional(),
      score_max: z.number().min(0).max(100).optional(),
    })
    .optional(),
  columns: z.array(z.string()).optional(),
})

export type CreateExportInput = z.infer<typeof createExportSchema>

/**
 * Export download parameters
 */
export const exportDownloadSchema = z.object({
  data: z.string().optional(),
  name: z.string().optional(),
  ext: z.enum(['xlsx', 'csv', 'pdf']).optional(),
})
