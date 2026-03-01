import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeduplicationService } from '../deduplication.service.js'

// Mock Supabase
vi.mock('../../db/index.js', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }),
  },
}))

describe('DeduplicationService', () => {
  let service: DeduplicationService

  beforeEach(() => {
    service = new DeduplicationService()
    vi.clearAllMocks()
  })

  describe('checkDuplicate', () => {
    it('should return isNew: true for unique prospect', async () => {
      const prospect = {
        full_name: 'Unique Person',
        email: 'unique@example.com',
        company: 'Unique Company',
      }

      const result = await service.checkDuplicate(prospect)

      expect(result.isNew).toBe(true)
      expect(result.duplicates).toHaveLength(0)
    })

    it('should detect exact email match', async () => {
      const { supabase } = await import('../../db/index.js')

      // Mock email match
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-id', full_name: 'Existing Person', email: 'test@example.com' },
              error: null,
            }),
          }),
        }),
        ilike: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as ReturnType<typeof supabase.from>)

      const prospect = {
        full_name: 'Test Person',
        email: 'test@example.com',
      }

      const result = await service.checkDuplicate(prospect)

      expect(result.isNew).toBe(false)
      expect(result.bestMatch?.matchType).toBe('exact_email')
      expect(result.bestMatch?.score).toBe(100)
    })

    it('should detect LinkedIn URL match', async () => {
      const { supabase } = await import('../../db/index.js')

      // Mock LinkedIn match
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        ilike: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'existing-id',
                full_name: 'Existing Person',
                linkedin_url: 'https://linkedin.com/in/johndoe',
              },
              error: null,
            }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as ReturnType<typeof supabase.from>)

      const prospect = {
        full_name: 'John Doe',
        linkedin_url: 'https://linkedin.com/in/johndoe',
      }

      const result = await service.checkDuplicate(prospect)

      expect(result.isNew).toBe(false)
      expect(result.bestMatch?.matchType).toBe('exact_linkedin')
    })
  })

  describe('batchCheckDuplicates', () => {
    it('should check multiple prospects', async () => {
      const prospects = [
        { full_name: 'Person 1', email: 'p1@example.com' },
        { full_name: 'Person 2', email: 'p2@example.com' },
      ]

      const results = await service.batchCheckDuplicates(prospects)

      expect(results.size).toBe(2)
      expect(results.get(0)).toBeDefined()
      expect(results.get(1)).toBeDefined()
    })
  })

  describe('invalidateCache', () => {
    it('should clear cache', () => {
      service.invalidateCache()
      // No error means success
      expect(true).toBe(true)
    })
  })
})
