import type {
  Prospect,
  ProspectFilters,
  DashboardStats,
  ActivityLog,
  Scraper,
  EnrichmentRequest,
  EnrichmentResult,
  ExportRecord,
  AppSettings,
  TargetCompany,
  ApiResponse,
  PaginatedResponse,
  HunterQuota,
  HunterCacheStats,
  HunterDomainResult,
  Event,
  EventStatus,
  ProspectEvent,
  ProspectEventStatus,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(error.error || 'Request failed', response.status)
  }

  return response.json()
}

// Dashboard
export const dashboardApi = {
  getStats: () => fetchApi<ApiResponse<DashboardStats>>('/dashboard/stats'),
  getActivity: (limit = 50) =>
    fetchApi<ApiResponse<ActivityLog[]>>(`/dashboard/activity?limit=${limit}`),
}

// Prospects
export const prospectsApi = {
  list: (params: {
    page?: number
    per_page?: number
    filters?: Partial<ProspectFilters>
    sort_by?: string
    sort_dir?: 'asc' | 'desc'
  }) => {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', params.page.toString())
    if (params.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params.sort_by) searchParams.set('sort_by', params.sort_by)
    if (params.sort_dir) searchParams.set('sort_dir', params.sort_dir)
    if (params.filters) {
      searchParams.set('filters', JSON.stringify(params.filters))
    }
    return fetchApi<PaginatedResponse<Prospect>>(`/prospects?${searchParams}`)
  },

  get: (id: string) => fetchApi<ApiResponse<Prospect>>(`/prospects/${id}`),

  create: (data: Partial<Prospect>) =>
    fetchApi<ApiResponse<Prospect>>('/prospects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Prospect>) =>
    fetchApi<ApiResponse<Prospect>>(`/prospects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<ApiResponse<void>>(`/prospects/${id}`, {
      method: 'DELETE',
    }),

  updateStatus: (id: string, status: Prospect['status']) =>
    fetchApi<ApiResponse<Prospect>>(`/prospects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  bulkUpdateStatus: (ids: string[], status: Prospect['status']) =>
    fetchApi<ApiResponse<{ updated: number }>>('/prospects/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  bulkDelete: (ids: string[]) =>
    fetchApi<ApiResponse<{ deleted: number }>>('/prospects/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
}

// Scrapers
export const scrapersApi = {
  list: () => fetchApi<ApiResponse<Scraper[]>>('/scrapers'),

  get: (id: string) => fetchApi<ApiResponse<Scraper>>(`/scrapers/${id}`),

  create: (data: {
    name: string
    type: Scraper['type']
    description?: string
    config?: Scraper['config']
    is_active?: boolean
  }) =>
    fetchApi<ApiResponse<Scraper>>('/scrapers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateConfig: (id: string, config: Scraper['config']) =>
    fetchApi<ApiResponse<Scraper>>(`/scrapers/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  toggle: (id: string, is_active: boolean) =>
    fetchApi<ApiResponse<Scraper>>(`/scrapers/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ is_active }),
    }),

  run: (id: string) =>
    fetchApi<ApiResponse<{ job_id: string }>>(`/scrapers/${id}/run`, {
      method: 'POST',
    }),

  getStatus: (jobId: string) =>
    fetchApi<
      ApiResponse<{
        status: 'pending' | 'running' | 'completed' | 'failed'
        progress: number
        results_count: number
        error?: string
      }>
    >(`/scrapers/jobs/${jobId}/status`),

  importResults: (jobId: string) =>
    fetchApi<ApiResponse<{ imported: number }>>(`/scrapers/jobs/${jobId}/import`, {
      method: 'POST',
    }),
}

// AI Research
export interface AIResearchProgress {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  currentStage: string
  urlsProcessed: number
  urlsTotal: number
  prospectsFound: number
  message: string
  error?: string
}

export const researchApi = {
  startAIResearch: (params: {
    query: string
    maxUrls?: number
    keywords?: string[]
    targetRoles?: string[]
    targetVerticals?: string[]
  }) =>
    fetchApi<ApiResponse<{ job_id: string }>>('/research/ai', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getAIResearchStatus: (jobId: string) =>
    fetchApi<ApiResponse<AIResearchProgress>>(`/research/ai/${jobId}/status`),
}

// Enrichment
export const enrichmentApi = {
  getQueue: () =>
    fetchApi<ApiResponse<{ count: number; prospects: Prospect[] }>>(
      '/enrichment/queue',
    ),

  run: (request: EnrichmentRequest) =>
    fetchApi<ApiResponse<{ job_id: string }>>('/enrichment/run', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getStatus: (jobId: string) =>
    fetchApi<
      ApiResponse<{
        status: 'pending' | 'running' | 'completed' | 'failed'
        progress: number
        results: EnrichmentResult[]
      }>
    >(`/enrichment/jobs/${jobId}/status`),

  getStats: () =>
    fetchApi<
      ApiResponse<{
        enriched_today: number
        avg_score: number | null
        total_enriched: number
      }>
    >('/enrichment/stats'),
}

// Export
export const exportApi = {
  create: (params: {
    format: 'xlsx' | 'csv' | 'pdf'
    filters?: Partial<ProspectFilters>
    columns?: string[]
    name?: string
  }) =>
    fetchApi<ApiResponse<{ export_id: string; download_url: string }>>(
      '/export',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    ),

  getHistory: () => fetchApi<ApiResponse<ExportRecord[]>>('/export/history'),

  download: (id: string) => `${API_BASE}/export/${id}/download`,
}

// Settings
export const settingsApi = {
  get: () => fetchApi<ApiResponse<AppSettings>>('/settings'),

  update: (settings: Partial<AppSettings>) =>
    fetchApi<ApiResponse<AppSettings>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
}

// Target Companies
export const targetCompaniesApi = {
  list: () => fetchApi<ApiResponse<TargetCompany[]>>('/target-companies'),

  create: (data: Omit<TargetCompany, 'id'>) =>
    fetchApi<ApiResponse<TargetCompany>>('/target-companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<TargetCompany>) =>
    fetchApi<ApiResponse<TargetCompany>>(`/target-companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<ApiResponse<void>>(`/target-companies/${id}`, {
      method: 'DELETE',
    }),
}

// Hunter.io API
export const hunterApi = {
  getQuota: () => fetchApi<ApiResponse<HunterQuota>>('/hunter/quota'),

  getCacheStats: () => fetchApi<ApiResponse<HunterCacheStats>>('/hunter/cache-stats'),

  clearCache: () =>
    fetchApi<ApiResponse<{ deleted: number }>>('/hunter/cache', {
      method: 'DELETE',
    }),

  domainSearch: (params: {
    domain: string
    limit?: number
    department?: string
    seniority?: string
  }) =>
    fetchApi<ApiResponse<HunterDomainResult>>('/hunter/domain-search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  emailLookup: (params: {
    first_name: string
    last_name: string
    company: string
    website?: string
  }) =>
    fetchApi<
      ApiResponse<{
        found: boolean
        email: string | null
        score?: number
        verified?: boolean
        source?: string
        linkedin?: string
        position?: string
      }>
    >('/hunter/email-lookup', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  bulkLookup: (prospects: Array<{
    id: string
    first_name: string
    last_name: string
    company: string
    website?: string
  }>) =>
    fetchApi<
      ApiResponse<{
        found: number
        total: number
        results: Record<string, {
          email: string | null
          score: number
          verified: boolean
          source: string
        }>
      }>
    >('/hunter/bulk-lookup', {
      method: 'POST',
      body: JSON.stringify({ prospects }),
    }),

  enrichProspects: (prospectIds: string[]) =>
    fetchApi<
      ApiResponse<{
        processed: number
        found: number
        updated: number
      }>
    >('/hunter/enrich-prospects', {
      method: 'POST',
      body: JSON.stringify({ prospect_ids: prospectIds }),
    }),
}

// Events
export const eventsApi = {
  list: (params?: { status?: EventStatus }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    const query = searchParams.toString()
    return fetchApi<ApiResponse<Event[]>>(`/events${query ? `?${query}` : ''}`)
  },

  get: (id: string) => fetchApi<ApiResponse<Event>>(`/events/${id}`),

  create: (data: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'prospect_count' | 'registered_count' | 'confirmed_count'>) =>
    fetchApi<ApiResponse<Event>>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Event>) =>
    fetchApi<ApiResponse<Event>>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<ApiResponse<void>>(`/events/${id}`, {
      method: 'DELETE',
    }),

  // Get prospects for an event (pipeline view)
  getProspects: (eventId: string, status?: ProspectEventStatus) => {
    const searchParams = new URLSearchParams()
    if (status) searchParams.set('status', status)
    const query = searchParams.toString()
    return fetchApi<ApiResponse<ProspectEvent[]>>(
      `/events/${eventId}/prospects${query ? `?${query}` : ''}`
    )
  },

  // Add prospect to event
  addProspect: (eventId: string, data: {
    prospect_id: string
    target_role: 'Attendee' | 'Sponsor' | 'Speaker'
    status?: ProspectEventStatus
    notes?: string
  }) =>
    fetchApi<ApiResponse<ProspectEvent>>(`/events/${eventId}/prospects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update prospect status in event
  updateProspectStatus: (eventId: string, prospectEventId: string, status: ProspectEventStatus) =>
    fetchApi<ApiResponse<ProspectEvent>>(`/events/${eventId}/prospects/${prospectEventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Remove prospect from event
  removeProspect: (eventId: string, prospectEventId: string) =>
    fetchApi<ApiResponse<void>>(`/events/${eventId}/prospects/${prospectEventId}`, {
      method: 'DELETE',
    }),

  // Get event stats
  getStats: (eventId: string) =>
    fetchApi<ApiResponse<{
      total: number
      by_status: Record<ProspectEventStatus, number>
      by_role: Record<string, number>
    }>>(`/events/${eventId}/stats`),

  // Bulk add prospects to event
  bulkAddProspects: (eventId: string, data: {
    prospect_ids: string[]
    target_role: 'Attendee' | 'Sponsor' | 'Speaker'
    status?: ProspectEventStatus
  }) =>
    fetchApi<ApiResponse<{ added: number }>>(`/events/${eventId}/prospects/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Prospect Events (from prospect perspective)
export const prospectEventsApi = {
  // Get all events for a prospect
  getForProspect: (prospectId: string) =>
    fetchApi<ApiResponse<ProspectEvent[]>>(`/events/prospect/${prospectId}/events`),

  // Add prospect to event - use eventsApi.addProspect instead
  // This is handled from the event side via eventsApi.addProspect(eventId, { prospect_id, ... })

  // Update status - use eventsApi.updateProspectStatus instead
  // This is handled from the event side via eventsApi.updateProspectStatus(eventId, prospectEventId, status)

  // Remove from event - use eventsApi.removeProspect instead
  // This is handled from the event side via eventsApi.removeProspect(eventId, prospectEventId)
}

export { ApiError }
