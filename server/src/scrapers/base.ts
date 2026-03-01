import puppeteer, { Browser, Page } from 'puppeteer'
import { createLogger } from '../utils/logger.js'

export type ScraperType = 'conference' | 'directory' | 'news' | 'company' | 'cre_deal'

export interface ScraperConfig {
  urls: string[]
  keywords: string[]
  selectors?: Record<string, string>
  pagination?: {
    type: 'page' | 'scroll' | 'load_more'
    max_pages: number
  }
}

export interface ProspectData {
  full_name: string
  title?: string
  company?: string
  email?: string
  phone?: string
  linkedin_url?: string
  source_url?: string
  source_type?: string
  raw_data?: Record<string, unknown>
}

export interface ScrapeResult {
  success: boolean
  prospects: ProspectData[]
  errors: string[]
  metadata: {
    pagesScraped: number
    duration: number
    url: string
  }
}

export interface ScraperProgress {
  current: number
  total: number
  status: 'running' | 'complete' | 'error'
  message: string
}

/**
 * Abstract base class for all scrapers
 * Provides common functionality like browser management, rate limiting, and error handling
 */
export abstract class BaseScraper {
  abstract readonly name: string
  abstract readonly type: ScraperType
  abstract readonly description: string

  protected logger = createLogger({ scraper: this.constructor.name })
  protected browser: Browser | null = null

  /**
   * Main scrape method - yields prospects as they are found
   */
  abstract scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData>

  /**
   * Validate configuration before scraping
   */
  validateConfig(config: ScraperConfig): string[] {
    const errors: string[] = []
    if (!config.urls || config.urls.length === 0) {
      errors.push('At least one URL is required')
    }
    config.urls.forEach((url, idx) => {
      try {
        new URL(url)
      } catch {
        errors.push(`Invalid URL at index ${idx}: ${url}`)
      }
    })
    return errors
  }

  /**
   * Execute scraper and collect all results
   */
  async run(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): Promise<ScrapeResult> {
    const startTime = Date.now()
    const prospects: ProspectData[] = []
    const errors: string[] = []
    let pagesScraped = 0

    // Validate config
    const validationErrors = this.validateConfig(config)
    if (validationErrors.length > 0) {
      return {
        success: false,
        prospects: [],
        errors: validationErrors,
        metadata: {
          pagesScraped: 0,
          duration: 0,
          url: config.urls[0] || '',
        },
      }
    }

    try {
      this.logger.info({ config }, 'Starting scrape')

      for await (const prospect of this.scrape(config, onProgress)) {
        prospects.push(prospect)
        pagesScraped++
      }

      this.logger.info(
        { prospectCount: prospects.length, duration: Date.now() - startTime },
        'Scrape complete'
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(errorMessage)
      this.logger.error({ error: errorMessage }, 'Scrape failed')
    } finally {
      await this.cleanup()
    }

    return {
      success: errors.length === 0,
      prospects,
      errors,
      metadata: {
        pagesScraped,
        duration: Date.now() - startTime,
        url: config.urls[0] || '',
      },
    }
  }

  /**
   * Get or create browser instance
   */
  protected async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      })
    }
    return this.browser
  }

  /**
   * Execute function with browser page, handling cleanup
   */
  protected async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    try {
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setUserAgent(this.getRandomUserAgent())

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      })

      return await fn(page)
    } finally {
      await page.close()
    }
  }

  /**
   * Execute with retry logic
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        this.logger.warn(
          { attempt, maxRetries, error: lastError.message },
          'Retry attempt failed'
        )

        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(delayMs * Math.pow(2, attempt - 1))
        }
      }
    }

    throw lastError
  }

  /**
   * Check robots.txt before scraping
   */
  protected async canScrape(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url)
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`

      const response = await fetch(robotsUrl)
      if (!response.ok) {
        // No robots.txt - assume allowed
        return true
      }

      const robotsTxt = await response.text()
      const lines = robotsTxt.split('\n')

      let currentUserAgent = ''
      let isDisallowed = false

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase()

        if (trimmed.startsWith('user-agent:')) {
          currentUserAgent = trimmed.replace('user-agent:', '').trim()
        } else if (trimmed.startsWith('disallow:') && (currentUserAgent === '*' || currentUserAgent === 'bot')) {
          const path = trimmed.replace('disallow:', '').trim()
          if (path === '/' || urlObj.pathname.startsWith(path)) {
            isDisallowed = true
            break
          }
        }
      }

      return !isDisallowed
    } catch {
      // If we can't check, assume allowed
      return true
    }
  }

  /**
   * Random user agent rotation
   */
  protected getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]
    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }

  /**
   * Delay helper for rate limiting
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Extract text content from element
   */
  protected async extractText(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector)
      if (!element) return null
      return await page.evaluate((el) => el.textContent?.trim() || null, element)
    } catch {
      return null
    }
  }

  /**
   * Extract multiple text contents
   */
  protected async extractAllText(page: Page, selector: string): Promise<string[]> {
    try {
      const elements = await page.$$(selector)
      const texts: string[] = []
      for (const element of elements) {
        const text = await page.evaluate((el) => el.textContent?.trim() || '', element)
        if (text) texts.push(text)
      }
      return texts
    } catch {
      return []
    }
  }

  /**
   * Extract href from link
   */
  protected async extractHref(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector)
      if (!element) return null
      return await page.evaluate((el) => (el as HTMLAnchorElement).href || null, element)
    } catch {
      return null
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Parse name into first/last
   */
  protected parseName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' }
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    }
  }

  /**
   * Normalize company name
   */
  protected normalizeCompany(company: string): string {
    return company
      .trim()
      .replace(/,?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)$/i, '')
      .trim()
  }

  /**
   * Extract email from text using regex
   */
  protected extractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const match = text.match(emailRegex)
    return match ? match[0].toLowerCase() : null
  }

  /**
   * Extract LinkedIn URL from text
   */
  protected extractLinkedIn(text: string): string | null {
    const linkedInRegex = /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i
    const match = text.match(linkedInRegex)
    return match ? match[0] : null
  }
}
