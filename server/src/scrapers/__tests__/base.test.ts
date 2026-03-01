import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BaseScraper, ScraperConfig, ProspectData, ScraperProgress } from '../base.js'

// Concrete implementation for testing
class TestScraper extends BaseScraper {
  readonly name = 'Test Scraper'
  readonly type = 'conference' as const
  readonly description = 'Test scraper for unit tests'

  private mockProspects: ProspectData[] = []

  setMockProspects(prospects: ProspectData[]) {
    this.mockProspects = prospects
  }

  async *scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData> {
    for (let i = 0; i < this.mockProspects.length; i++) {
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: this.mockProspects.length,
          status: 'running',
          message: `Scraping ${this.mockProspects[i].full_name}`,
        })
      }
      yield this.mockProspects[i]
    }
  }
}

describe('BaseScraper', () => {
  let scraper: TestScraper

  beforeEach(() => {
    scraper = new TestScraper()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await scraper.cleanup()
  })

  describe('validateConfig', () => {
    it('should pass with valid config', () => {
      const config: ScraperConfig = {
        urls: ['https://example.com'],
        keywords: ['test'],
      }

      const errors = scraper.validateConfig(config)
      expect(errors).toHaveLength(0)
    })

    it('should fail with no URLs', () => {
      const config: ScraperConfig = {
        urls: [],
        keywords: [],
      }

      const errors = scraper.validateConfig(config)
      expect(errors).toContain('At least one URL is required')
    })

    it('should fail with invalid URL', () => {
      const config: ScraperConfig = {
        urls: ['not-a-url'],
        keywords: [],
      }

      const errors = scraper.validateConfig(config)
      expect(errors.some((e) => e.includes('Invalid URL'))).toBe(true)
    })

    it('should pass with multiple valid URLs', () => {
      const config: ScraperConfig = {
        urls: ['https://example1.com', 'https://example2.com/page'],
        keywords: ['keyword1', 'keyword2'],
      }

      const errors = scraper.validateConfig(config)
      expect(errors).toHaveLength(0)
    })
  })

  describe('run', () => {
    it('should return results from scrape', async () => {
      const mockProspects: ProspectData[] = [
        { full_name: 'John Smith', title: 'CEO', company: 'Test Corp' },
        { full_name: 'Jane Doe', title: 'CTO', company: 'Test Corp' },
      ]
      scraper.setMockProspects(mockProspects)

      const config: ScraperConfig = {
        urls: ['https://example.com'],
        keywords: [],
      }

      const result = await scraper.run(config)

      expect(result.success).toBe(true)
      expect(result.prospects).toHaveLength(2)
      expect(result.prospects[0].full_name).toBe('John Smith')
      expect(result.prospects[1].full_name).toBe('Jane Doe')
    })

    it('should report progress', async () => {
      const mockProspects: ProspectData[] = [
        { full_name: 'Person 1' },
        { full_name: 'Person 2' },
        { full_name: 'Person 3' },
      ]
      scraper.setMockProspects(mockProspects)

      const progressUpdates: ScraperProgress[] = []
      const onProgress = (progress: ScraperProgress) => {
        progressUpdates.push({ ...progress })
      }

      const config: ScraperConfig = {
        urls: ['https://example.com'],
        keywords: [],
      }

      await scraper.run(config, onProgress)

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('complete')
    })

    it('should return validation errors for invalid config', async () => {
      const config: ScraperConfig = {
        urls: [],
        keywords: [],
      }

      const result = await scraper.run(config)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('At least one URL is required')
    })

    it('should include metadata in results', async () => {
      scraper.setMockProspects([{ full_name: 'Test' }])

      const config: ScraperConfig = {
        urls: ['https://example.com'],
        keywords: [],
      }

      const result = await scraper.run(config)

      expect(result.metadata).toBeDefined()
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0)
      expect(result.metadata.url).toBe('https://example.com')
    })
  })

  describe('utility methods', () => {
    it('parseName should split full names correctly', () => {
      const scraper = new TestScraper() as TestScraper & {
        parseName: (name: string) => { firstName: string; lastName: string }
      }

      expect(scraper['parseName']('John Smith')).toEqual({
        firstName: 'John',
        lastName: 'Smith',
      })

      expect(scraper['parseName']('John Paul Smith')).toEqual({
        firstName: 'John',
        lastName: 'Paul Smith',
      })

      expect(scraper['parseName']('Madonna')).toEqual({
        firstName: 'Madonna',
        lastName: '',
      })
    })

    it('normalizeCompany should remove common suffixes', () => {
      const testCases = [
        ['Acme Inc', 'Acme'],
        ['Acme Inc.', 'Acme'],
        ['Acme Corporation', 'Acme'],
        ['Acme LLC', 'Acme'],
        ['Acme Ltd', 'Acme'],
        ['Acme Ltd.', 'Acme'],
        ['Acme Corp', 'Acme'],
        ['Acme Company', 'Acme'],
        ['Acme Co.', 'Acme'],
        ['Acme', 'Acme'],
      ]

      for (const [input, expected] of testCases) {
        expect(scraper['normalizeCompany'](input)).toBe(expected)
      }
    })

    it('extractEmail should find emails in text', () => {
      expect(scraper['extractEmail']('Contact: john@example.com for more')).toBe(
        'john@example.com'
      )
      expect(scraper['extractEmail']('No email here')).toBeNull()
      expect(
        scraper['extractEmail']('Multiple test@a.com and test@b.com emails')
      ).toBe('test@a.com')
    })

    it('extractLinkedIn should find LinkedIn URLs', () => {
      expect(
        scraper['extractLinkedIn']('Visit https://linkedin.com/in/johndoe')
      ).toBe('https://linkedin.com/in/johndoe')
      expect(
        scraper['extractLinkedIn']('https://www.linkedin.com/in/jane-doe/')
      ).toBe('https://www.linkedin.com/in/jane-doe/')
      expect(scraper['extractLinkedIn']('No LinkedIn here')).toBeNull()
    })

    it('getRandomUserAgent should return a user agent string', () => {
      const ua = scraper['getRandomUserAgent']()
      expect(ua).toBeDefined()
      expect(typeof ua).toBe('string')
      expect(ua.length).toBeGreaterThan(50)
    })
  })
})
