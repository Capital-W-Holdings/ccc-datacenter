import puppeteer, { Browser, Page } from 'puppeteer'
import { createLogger } from '../../utils/logger.js'
import { getRandomUserAgent } from './user-agents.js'

const logger = createLogger({ module: 'browser-pool' })

interface BrowserPoolConfig {
  maxBrowsers: number
  pagesPerBrowser: number
  browserTimeout: number
  pageTimeout: number
}

interface PooledBrowser {
  browser: Browser
  pageCount: number
  createdAt: number
  lastUsed: number
}

/**
 * Manages a pool of browser instances for efficient scraping
 */
export class BrowserPool {
  private browsers: PooledBrowser[] = []
  private config: BrowserPoolConfig
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(config?: Partial<BrowserPoolConfig>) {
    this.config = {
      maxBrowsers: config?.maxBrowsers || 3,
      pagesPerBrowser: config?.pagesPerBrowser || 5,
      browserTimeout: config?.browserTimeout || 30 * 60 * 1000, // 30 minutes
      pageTimeout: config?.pageTimeout || 30 * 1000, // 30 seconds
    }

    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Get a page from the pool
   */
  async getPage(): Promise<{ page: Page; release: () => Promise<void> }> {
    const browser = await this.getBrowser()
    const page = await browser.browser.newPage()

    // Configure page
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(getRandomUserAgent())
    await page.setDefaultNavigationTimeout(this.config.pageTimeout)
    await page.setDefaultTimeout(this.config.pageTimeout)

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    })

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const resourceType = request.resourceType()
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort()
      } else {
        request.continue()
      }
    })

    browser.pageCount++
    browser.lastUsed = Date.now()

    const release = async () => {
      try {
        await page.close()
        browser.pageCount--
      } catch {
        // Page may already be closed
      }
    }

    return { page, release }
  }

  /**
   * Get or create a browser from the pool
   */
  private async getBrowser(): Promise<PooledBrowser> {
    // Find available browser
    const available = this.browsers.find(
      (b) => b.pageCount < this.config.pagesPerBrowser
    )
    if (available) {
      return available
    }

    // Create new browser if under limit
    if (this.browsers.length < this.config.maxBrowsers) {
      const browser = await this.createBrowser()
      this.browsers.push(browser)
      return browser
    }

    // Wait for available browser
    logger.info('Browser pool full, waiting for available browser')
    await this.delay(1000)
    return this.getBrowser()
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<PooledBrowser> {
    logger.info('Creating new browser instance')

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    })

    return {
      browser,
      pageCount: 0,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStale()
    }, 60000) // Check every minute
  }

  /**
   * Clean up stale browsers
   */
  private async cleanupStale(): Promise<void> {
    const now = Date.now()
    const stale = this.browsers.filter(
      (b) =>
        b.pageCount === 0 &&
        (now - b.lastUsed > this.config.browserTimeout ||
          now - b.createdAt > this.config.browserTimeout * 2)
    )

    for (const browser of stale) {
      logger.info('Closing stale browser')
      await this.closeBrowser(browser)
    }
  }

  /**
   * Close a browser and remove from pool
   */
  private async closeBrowser(pooled: PooledBrowser): Promise<void> {
    const index = this.browsers.indexOf(pooled)
    if (index !== -1) {
      this.browsers.splice(index, 1)
    }

    try {
      await pooled.browser.close()
    } catch {
      // Browser may already be closed
    }
  }

  /**
   * Close all browsers and shutdown pool
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down browser pool')

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    for (const browser of this.browsers) {
      await this.closeBrowser(browser)
    }

    this.browsers = []
  }

  /**
   * Get pool status
   */
  getStatus(): {
    browsers: number
    totalPages: number
    maxBrowsers: number
    maxPages: number
  } {
    const totalPages = this.browsers.reduce((sum, b) => sum + b.pageCount, 0)
    return {
      browsers: this.browsers.length,
      totalPages,
      maxBrowsers: this.config.maxBrowsers,
      maxPages: this.config.maxBrowsers * this.config.pagesPerBrowser,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const browserPool = new BrowserPool()

// Cleanup on process exit
process.on('SIGTERM', async () => {
  await browserPool.shutdown()
})

process.on('SIGINT', async () => {
  await browserPool.shutdown()
})
