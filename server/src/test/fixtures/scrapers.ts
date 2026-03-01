/**
 * Test fixtures for scrapers
 */

export const mockScraper = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'Test Conference Scraper',
  type: 'conference',
  description: 'Test scraper for unit tests',
  config: {
    urls: ['https://example.com/speakers'],
    keywords: ['data center', 'cloud'],
    pagination: {
      type: 'page',
      max_pages: 5,
    },
  },
  is_active: true,
  last_run: '2024-01-15T10:00:00Z',
  total_runs: 5,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockScrapers = [
  mockScraper,
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Test News Scraper',
    type: 'news',
    description: 'News site scraper for tests',
    config: {
      urls: ['https://example.com/news'],
      keywords: ['infrastructure'],
    },
    is_active: false,
    last_run: null,
    total_runs: 0,
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
  },
]

export const mockScrapeJob = {
  id: '550e8400-e29b-41d4-a716-446655440020',
  scraper_id: mockScraper.id,
  status: 'running',
  results_count: 0,
  saved_count: 0,
  duration_ms: null,
  error_log: null,
  started_at: '2024-01-15T10:00:00Z',
  completed_at: null,
}

export const completedScrapeJob = {
  ...mockScrapeJob,
  id: '550e8400-e29b-41d4-a716-446655440021',
  status: 'completed',
  results_count: 25,
  saved_count: 20,
  duration_ms: 15000,
  completed_at: '2024-01-15T10:00:15Z',
}

export const createScraperInput = {
  name: 'New Test Scraper',
  type: 'conference' as const,
  description: 'A test scraper',
  config: {
    urls: ['https://example.com'],
    keywords: ['test'],
  },
  is_active: false,
}

export const invalidScraperInputs = {
  missingName: {
    type: 'conference',
    config: { urls: [] },
  },
  invalidType: {
    name: 'Test',
    type: 'invalid_type',
    config: { urls: [] },
  },
  invalidUrls: {
    name: 'Test',
    type: 'conference',
    config: {
      urls: ['not-a-url'],
    },
  },
}
