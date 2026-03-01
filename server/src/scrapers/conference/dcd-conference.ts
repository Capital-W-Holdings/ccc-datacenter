import { BaseScraper, ScraperConfig, ProspectData, ScraperProgress } from '../base.js'
import { scraperRateLimiter } from '../utils/rate-limiter.js'
import { Page } from 'puppeteer'

/**
 * Scraper for DCD Connect (DataCenter Dynamics) conferences
 * Extracts speakers and exhibitors from DCD events
 */
export class DCDConnectScraper extends BaseScraper {
  readonly name = 'DCD Connect'
  readonly type = 'conference' as const
  readonly description = 'Extract speakers and exhibitors from DCD Connect conference events'

  private defaultUrls = ['https://www.datacenterdynamics.com/en/dcd-connect/']

  async *scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData> {
    const urls = config.urls.length > 0 ? config.urls : this.defaultUrls
    let currentItem = 0
    let totalItems = 0

    for (const url of urls) {
      // Check robots.txt
      const canScrape = await this.canScrape(url)
      if (!canScrape) {
        this.logger.warn({ url }, 'Blocked by robots.txt')
        continue
      }

      // Wait for rate limit
      await scraperRateLimiter.waitForSlot(url)

      try {
        // First, discover event pages
        const eventUrls = await this.discoverEvents(url)
        totalItems = eventUrls.length * 50 // Estimate

        for (const eventUrl of eventUrls) {
          await scraperRateLimiter.waitForSlot(eventUrl)

          const prospects = await this.scrapeEventPage(eventUrl, config)

          for (const prospect of prospects) {
            currentItem++
            if (onProgress) {
              onProgress({
                current: currentItem,
                total: totalItems,
                status: 'running',
                message: `Found: ${prospect.full_name}`,
              })
            }
            yield prospect
          }
        }
      } catch (error) {
        this.logger.error(
          { url, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to scrape'
        )
      }
    }

    if (onProgress) {
      onProgress({
        current: currentItem,
        total: currentItem,
        status: 'complete',
        message: 'Scrape complete',
      })
    }
  }

  private async discoverEvents(baseUrl: string): Promise<string[]> {
    const events: string[] = []

    await this.withPage(async (page: Page) => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 })
      await this.delay(2000)

      // Find event links
      const links = await page.$$eval(
        'a[href*="/dcd-connect/"], a[href*="/events/"]',
        (els: Element[]) =>
          els
            .map((el) => (el as HTMLAnchorElement).href)
            .filter((href) => href && !href.includes('#'))
      )

      // Filter to unique event pages
      const uniqueLinks = [...new Set(links)]
      events.push(...uniqueLinks.slice(0, 10)) // Limit to 10 events
    })

    return events
  }

  private async scrapeEventPage(url: string, config: ScraperConfig): Promise<ProspectData[]> {
    const prospects: ProspectData[] = []

    await this.withPage(async (page: Page) => {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
      await this.delay(2000)

      // Try to find speakers section
      const speakerSections = await page.$$('[class*="speaker"], [class*="agenda"], [id*="speaker"]')

      for (const section of speakerSections) {
        const cards = await section.$$('[class*="card"], [class*="item"], [class*="profile"]')

        for (const card of cards) {
          try {
            const name = await card.$eval(
              'h2, h3, h4, [class*="name"]',
              (el: Element) => el.textContent?.trim() || ''
            ).catch(() => '')

            const title = await card.$eval(
              '[class*="title"], [class*="role"], [class*="position"]',
              (el: Element) => el.textContent?.trim() || ''
            ).catch(() => '')

            const company = await card.$eval(
              '[class*="company"], [class*="org"]',
              (el: Element) => el.textContent?.trim() || ''
            ).catch(() => '')

            const linkedin = await card.$eval(
              'a[href*="linkedin"]',
              (el: Element) => (el as HTMLAnchorElement).href
            ).catch(() => null)

            if (name && this.matchesKeywords(name + ' ' + title + ' ' + company, config.keywords)) {
              prospects.push({
                full_name: name,
                title: title || undefined,
                company: company ? this.normalizeCompany(company) : undefined,
                linkedin_url: linkedin || undefined,
                source_url: url,
                source_type: 'conference_speaker',
              })
            }
          } catch {
            // Skip failed cards
          }
        }
      }

      // Try to find exhibitors/sponsors
      const exhibitorSections = await page.$$('[class*="sponsor"], [class*="exhibitor"], [class*="partner"]')

      for (const section of exhibitorSections) {
        const items = await section.$$('img, [class*="logo"]')

        for (const item of items) {
          try {
            const alt = await page.evaluate(
              (el: Element) => (el as HTMLImageElement).alt || '',
              item
            )

            if (alt && this.matchesKeywords(alt, config.keywords)) {
              prospects.push({
                full_name: `[Company] ${this.normalizeCompany(alt)}`,
                company: this.normalizeCompany(alt),
                source_url: url,
                source_type: 'conference_exhibitor',
                raw_data: {
                  needs_leadership_extraction: true,
                },
              })
            }
          } catch {
            // Skip failed items
          }
        }
      }
    })

    return prospects
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    if (keywords.length === 0) return true
    const lowerText = text.toLowerCase()
    return keywords.some((kw) => lowerText.includes(kw.toLowerCase()))
  }
}
