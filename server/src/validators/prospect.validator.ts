import { z } from 'zod'

// Valid enum values
const CCCVerticals = ['Development', 'Investment', 'Brokerage', 'Management', 'Construction'] as const
const TargetRoles = ['Attendee', 'Sponsor', 'Speaker'] as const
const CompanyTypes = [
  'Hyperscaler',
  'Developer/Operator',
  'Investor',
  'Broker',
  'Contractor',
  'Engineering',
  'Consulting',
  'Utility',
  'Carrier',
  'Other',
] as const
const ProspectStatuses = ['New', 'Reviewed', 'Qualified', 'Outreach', 'Confirmed', 'Declined'] as const

/**
 * Schema for creating a new prospect
 */
export const createProspectSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  title: z.string().max(200).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  company_type: z.enum(CompanyTypes).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')),
  location_city: z.string().max(100).optional().nullable(),
  location_state: z.string().max(100).optional().nullable(),
  location_country: z.string().max(100).optional().nullable(),
  ccc_verticals: z.array(z.enum(CCCVerticals)).default([]),
  target_roles: z.array(z.enum(TargetRoles)).default([]),
  relevance_score: z.number().min(0).max(100).default(0),
  status: z.enum(ProspectStatuses).default('New'),
  ai_summary: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export type CreateProspectInput = z.infer<typeof createProspectSchema>

/**
 * Schema for updating a prospect (all fields optional)
 */
export const updateProspectSchema = createProspectSchema.partial()

export type UpdateProspectInput = z.infer<typeof updateProspectSchema>

/**
 * Schema for prospect list query parameters
 */
export const listProspectsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(1000).default(50),
  sort_by: z.string().default('updated_at'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
  filters: z.string().optional(), // JSON string of filters
})

export type ListProspectsQuery = z.infer<typeof listProspectsQuerySchema>

/**
 * Schema for bulk status update
 */
export const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
  status: z.enum(ProspectStatuses),
})

export type BulkStatusInput = z.infer<typeof bulkStatusSchema>

/**
 * Schema for bulk delete
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
})

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>

/**
 * UUID parameter validation
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid prospect ID'),
})
