import { Page } from 'puppeteer'
import { BaseScraper, ScraperConfig, ProspectData, ScraperProgress } from '../base.js'
import { scraperRateLimiter } from '../utils/rate-limiter.js'

/**
 * Scraper for Data Centers World conferences
 * Extracts speakers, sponsors, and attendee information
 */
export class DataCentersWorldScraper extends BaseScraper {
  readonly name = 'Data Centers World'
  readonly type = 'conference' as const
  readonly description = 'Extract speakers and sponsors from Data Centers World conference events'

  private defaultUrls = [
    'https://www.datacentersworld.com/speakers',
    'https://www.datacentersworld.com/sponsors',
  ]

  async *scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData> {
    const urls = config.urls.length > 0 ? config.urls : this.defaultUrls
    const maxPages = config.pagination?.max_pages || 5
    let currentItem = 0
    const totalItems = urls.length * maxPages

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
        const prospects = await this.scrapePage(url, config)

        for (const prospect of prospects) {
          currentItem++
          if (onProgress) {
            onProgress({
              current: currentItem,
              total: totalItems,
              status: 'running',
              message: `Scraping ${prospect.full_name}`,
            })
          }
          yield prospect
        }
      } catch (error) {
        this.logger.error(
          { url, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to scrape page'
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

  private async scrapePage(url: string, config: ScraperConfig): Promise<ProspectData[]> {
    const prospects: ProspectData[] = []

    await this.withPage(async (page: Page) => {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

      // Wait for content to load
      await this.delay(2000)

      // Determine page type and scrape accordingly
      if (url.includes('speakers')) {
        const speakerData = await this.scrapeSpeakers(page, config)
        prospects.push(...speakerData)
      } else if (url.includes('sponsors')) {
        const sponsorData = await this.scrapeSponsors(page, config)
        prospects.push(...sponsorData)
      }
    })

    return prospects
  }

  private async scrapeSpeakers(page: Page, config: ScraperConfig): Promise<ProspectData[]> {
    const prospects: ProspectData[] = []

    // Common speaker card selectors
    const selectors = config.selectors || {
      card: '.speaker-card, .speaker-item, [class*="speaker"]',
      name: '.speaker-name, h3, h4, .name',
      title: '.speaker-title, .title, .position',
      company: '.speaker-company, .company, .organization',
      linkedin: 'a[href*="linkedin.com"]',
    }

    const cards = await page.$$(selectors.card)

    for (const card of cards) {
      try {
        const nameEl = await card.$(selectors.name)
        const titleEl = await card.$(selectors.title)
        const companyEl = await card.$(selectors.company)
        const linkedinEl = await card.$(selectors.linkedin)

        const name = nameEl
          ? await page.evaluate((el: Element) => el.textContent?.trim(), nameEl)
          : null
        const title = titleEl
          ? await page.evaluate((el: Element) => el.textContent?.trim(), titleEl)
          : null
        const company = companyEl
          ? await page.evaluate((el: Element) => el.textContent?.trim(), companyEl)
          : null
        const linkedin = linkedinEl
          ? await page.evaluate(
              (el: Element) => (el as HTMLAnchorElement).href,
              linkedinEl
            )
          : null

        if (name && this.matchesKeywords(name + ' ' + (title || '') + ' ' + (company || ''), config.keywords)) {
          prospects.push({
            full_name: name,
            title: title || undefined,
            company: company ? this.normalizeCompany(company) : undefined,
            linkedin_url: linkedin || undefined,
            source_url: page.url(),
            source_type: 'conference_speaker',
          })
        }
      } catch {
        // Skip failed cards
      }
    }

    return prospects
  }

  private async scrapeSponsors(page: Page, config: ScraperConfig): Promise<ProspectData[]> {
    const prospects: ProspectData[] = []

    // Common sponsor card selectors
    const selectors = config.selectors || {
      card: '.sponsor-card, .sponsor-item, [class*="sponsor"]',
      company: '.sponsor-name, h3, h4, img[alt]',
      link: 'a[href]',
    }

    const cards = await page.$$(selectors.card)

    for (const card of cards) {
      try {
        const companyEl = await card.$(selectors.company)
        const linkEl = await card.$(selectors.link)

        const company = companyEl
          ? await page.evaluate((el: Element) => {
              // Try text content first, then alt attribute for images
              return el.textContent?.trim() || (el as HTMLImageElement).alt?.trim() || null
            }, companyEl)
          : null

        const website = linkEl
          ? await page.evaluate(
              (el: Element) => (el as HTMLAnchorElement).href,
              linkEl
            )
          : null

        if (company && this.matchesKeywords(company, config.keywords)) {
          // For sponsors, we create a placeholder prospect
          // The enrichment step will find leadership contacts
          prospects.push({
            full_name: `[Company] ${this.normalizeCompany(company)}`,
            company: this.normalizeCompany(company),
            source_url: website || page.url(),
            source_type: 'conference_sponsor',
            raw_data: {
              needs_leadership_extraction: true,
              company_website: website,
            },
          })
        }
      } catch {
        // Skip failed cards
      }
    }

    return prospects
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    if (keywords.length === 0) return true
    const lowerText = text.toLowerCase()
    return keywords.some((kw) => lowerText.includes(kw.toLowerCase()))
  }
}
