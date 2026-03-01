// Event Status
export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'

// Prospect Event Status (pipeline stage per event)
export type ProspectEventStatus =
  | 'Identified'
  | 'Invited'
  | 'Registered'
  | 'Confirmed'
  | 'Attended'
  | 'No Show'
  | 'Declined'

// Event interface
export interface Event {
  id: string
  name: string
  slug: string
  location_city: string
  location_state: string
  venue: string | null
  date: string
  end_date: string | null
  description: string | null
  status: EventStatus
  expected_attendees: number | null
  website_url: string | null
  created_at: string
  updated_at: string
  // Computed fields
  prospect_count?: number
  registered_count?: number
  confirmed_count?: number
}

// Prospect-Event association
export interface ProspectEvent {
  id: string
  prospect_id: string
  event_id: string
  status: ProspectEventStatus
  target_role: 'Attendee' | 'Sponsor' | 'Speaker'
  notes: string | null
  invited_at: string | null
  registered_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  prospect?: Prospect
  event?: Event
}

// CCC Verticals
export type CCCVertical =
  | 'Development'
  | 'Investment'
  | 'Brokerage'
  | 'Management'
  | 'Construction'

// Target Roles for summit
export type TargetRole = 'Attendee' | 'Sponsor' | 'Speaker'

// Company Types in data center ecosystem
export type CompanyType =
  | 'Hyperscaler'
  | 'Developer/Operator'
  | 'Investor'
  | 'Broker'
  | 'Contractor'
  | 'Engineering'
  | 'Consulting'
  | 'Legal'
  | 'Finance'
  | 'Other'

// Prospect status (matches server validation)
export type ProspectStatus =
  | 'New'
  | 'Qualified'
  | 'Contacted'
  | 'Engaged'
  | 'Nurturing'
  | 'Archived'

// Pipeline stages
export type PipelineStage =
  | 'Scraped'
  | 'Enriched'
  | 'Categorized'
  | 'Qualified'
  | 'Outreach Ready'

// Scraper types
export type ScraperType =
  | 'conference'
  | 'directory'
  | 'news'
  | 'company'
  | 'cre_deal'
  | 'manual'
  | 'ai_research'

// Email source types
export type EmailSource = 'hunter' | 'pattern' | 'manual' | 'scraped'

// Core Prospect interface
export interface Prospect {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  title: string | null
  company: string | null
  company_type: CompanyType | null
  email: string | null
  email_verified: boolean
  email_source: EmailSource | null
  hunter_confidence: number
  phone: string | null
  linkedin_url: string | null
  website: string | null
  location_city: string | null
  location_state: string | null
  location_country: string
  ccc_verticals: CCCVertical[]
  target_roles: TargetRole[]
  relevance_score: number
  ai_summary: string | null
  status: ProspectStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Prospect source tracking
export interface ProspectSource {
  id: string
  prospect_id: string
  source_type: ScraperType
  source_name: string
  source_url: string | null
  raw_data: Record<string, unknown>
  scraped_at: string
}

// Scraper configuration
export interface Scraper {
  id: string
  name: string
  type: ScraperType
  description: string
  config: ScraperConfig
  is_active: boolean
  last_run: string | null
  last_result_count: number
  schedule: string | null
}

export interface ScraperConfig {
  urls?: string[]
  keywords?: string[]
  selectors?: Record<string, string>
  pagination?: {
    type: 'page' | 'scroll' | 'load_more'
    max_pages?: number
  }
}

// Target company for prioritization
export interface TargetCompany {
  id: string
  name: string
  category: 'Hyperscaler' | 'Developer/Operator' | 'Investor' | 'Construction' | 'Broker'
  website: string | null
  priority: number // 1-10, 1 is highest
}

// Activity log entry
export interface ActivityLog {
  id: string
  action: 'scrape_started' | 'scrape_completed' | 'enrichment_run' | 'export' | 'status_change' | 'prospect_added'
  details: Record<string, unknown>
  created_at: string
}

// Export record
export interface ExportRecord {
  id: string
  name: string
  format: 'xlsx' | 'csv' | 'pdf'
  filters: Record<string, unknown>
  record_count: number
  file_path: string | null
  created_at: string
}

// Dashboard stats
export interface DashboardStats {
  total_prospects: number
  by_target_role: {
    attendees: number
    sponsors: number
    speakers: number
  }
  by_vertical: {
    development: number
    investment: number
    brokerage: number
    management: number
    construction: number
  }
  by_status: Record<ProspectStatus, number>
  pipeline: {
    scraped: number
    enriched: number
    categorized: number
    qualified: number
    outreach_ready: number
  }
  sources_active: number
  enrichment_queue: number
  export_ready: number
}

// Filter state for prospects table
export interface ProspectFilters {
  search: string
  verticals: CCCVertical[]
  target_roles: TargetRole[]
  company_types: CompanyType[]
  statuses: ProspectStatus[]
  score_min: number
  score_max: number
  sources: string[]
  ids?: string[] // For exporting specific prospects
}

// Sort state
export interface SortState {
  column: keyof Prospect | null
  direction: 'asc' | 'desc'
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Enrichment types
export interface EnrichmentRequest {
  prospect_ids: string[]
  batch_size: number
}

export interface EnrichmentResult {
  prospect_id: string
  success: boolean
  changes: {
    company_type?: CompanyType
    ccc_verticals?: CCCVertical[]
    target_roles?: TargetRole[]
    relevance_score?: number
    ai_summary?: string
  }
  error?: string
}

// Settings
export interface AppSettings {
  anthropic_api_key: string | null
  hunter_api_key: string | null
  scraping_delay_ms: number
  enrichment_batch_size: number
  auto_enrich_on_import: boolean
}

// Hunter.io Types
export interface HunterQuota {
  configured: boolean
  quota: {
    used: number
    limit: number
    remaining: number
    resetAt: string | null
    percentUsed: number
  } | null
}

export interface HunterCacheStats {
  totalCached: number
  withEmail: number
  withoutEmail: number
  expired: number
  hitRate: number
}

export interface HunterDomainResult {
  domain: string
  organization: string
  emails: Array<{
    email: string
    firstName: string
    lastName: string
    position: string
    confidence: number
  }>
  totalEmails: number
}
