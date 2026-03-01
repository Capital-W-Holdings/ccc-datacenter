import { vi, beforeAll, afterAll, afterEach } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.APP_SECRET = 'test-secret-key'
process.env.ENCRYPTION_KEY = 'a'.repeat(64)
process.env.REDIS_URL = 'redis://localhost:6379'

// Mock fetch globally
global.fetch = vi.fn()

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Global setup
beforeAll(() => {
  // Suppress console output in tests
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Global teardown
afterAll(() => {
  vi.restoreAllMocks()
})

// Helper to create mock response
export function mockFetch(response: unknown, options?: { status?: number; ok?: boolean }) {
  return vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Headers(),
  } as Response)
}

// Helper to create mock Supabase response
export function mockSupabaseResponse<T>(data: T, error?: { message: string }) {
  return {
    data: error ? null : data,
    error: error || null,
  }
}

// Test utilities
export const testUtils = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  randomId: () => Math.random().toString(36).substring(2, 15),
  randomEmail: () => `test-${Math.random().toString(36).substring(2, 10)}@example.com`,
}
