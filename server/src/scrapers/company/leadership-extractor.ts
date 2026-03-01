import { BaseScraper, ScraperConfig, ProspectData, ScraperProgress } from '../base.js'
import { scraperRateLimiter } from '../utils/rate-limiter.js'
import { Page } from 'puppeteer'

/**
 * Scraper for extracting company leadership teams
 * Takes company websites and finds executives/leadership
 */
export class LeadershipExtractorScraper extends BaseScraper {
  readonly name = 'Leadership Extractor'
  readonly type = 'company' as const
  readonly description = 'Extract leadership team members from company websites'

  // Common paths for leadership pages
  private leadershipPaths = [
    '/leadership',
    '/about/leadership',
    '/about/team',
    '/about-us/leadership',
    '/about-us/team',
    '/team',
    '/our-team',
    '/management',
    '/executives',
    '/about/management',
    '/company/leadership',
    '/company/team',
  ]

  // Target roles for data center industry
  private targetRoles = [
    'ceo',
    'chief executive',
    'cto',
    'chief technology',
    'cfo',
    'chief financial',
    'coo',
    'chief operating',
    'president',
    'vice president',
    'vp',
    'svp',
    'evp',
    'director',
    'head of',
    'general manager',
    'managing director',
    'founder',
    'co-founder',
    'partner',
  ]

  async *scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData> {
    const urls = config.urls

    if (urls.length === 0) {
      this.logger.warn('No URLs provided for leadership extraction')
      return
    }

    let currentItem = 0
    const totalItems = urls.length

    for (const url of urls) {
      currentItem++

      if (onProgress) {
        onProgress({
          current: currentItem,
          total: totalItems,
          status: 'running',
          message: `Processing: ${url}`,
        })
      }

      const canScrape = await this.canScrape(url)
      if (!canScrape) {
        this.logger.warn({ url }, 'Blocked by robots.txt')
        continue
      }

      await scraperRateLimiter.waitForSlot(url)

      try {
        // First, find the leadership page
        const leadershipUrl = await this.findLeadershipPage(url)

        if (!leadershipUrl) {
          this.logger.info({ url }, 'No leadership page found')
          continue
        }

        await scraperRateLimiter.waitForSlot(leadershipUrl)

        // Extract leadership from the page
        const prospects = await this.extractLeadership(leadershipUrl, url, config)

        for (const prospect of prospects) {
          yield prospect
        }
      } catch (error) {
        this.logger.error(
          { url, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to extract leadership'
        )
      }
    }

    if (onProgress) {
      onProgress({
        current: currentItem,
        total: currentItem,
        status: 'complete',
        message: 'Extraction complete',
      })
    }
  }

  private async findLeadershipPage(baseUrl: string): Promise<string | null> {
    const urlObj = new URL(baseUrl)
    const baseOrigin = urlObj.origin

    // Try common paths first
    for (const path of this.leadershipPaths) {
      const testUrl = baseOrigin + path
      try {
        const response = await fetch(testUrl, { method: 'HEAD' })
        if (response.ok) {
          return testUrl
        }
      } catch {
        // Continue to next path
      }
    }

    // Fall back to scraping the site for leadership links
    try {
      let foundUrl: string | null = null

      await this.withPage(async (page: Page) => {
        await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 })
        await this.delay(2000)

        // Look for links containing leadership-related keywords
        const links = await page.$$eval('a', (els: Element[]) =>
          els.map((el) => ({
            href: (el as HTMLAnchorElement).href,
            text: el.textContent?.toLowerCase() || '',
          }))
        )

        const leadershipKeywords = [
          'leadership',
          'team',
          'management',
          'executive',
          'about us',
          'who we are',
        ]

        for (const link of links) {
          if (link.href && leadershipKeywords.some((kw) => link.text.includes(kw))) {
            foundUrl = link.href
            break
          }
        }
      })

      return foundUrl
    } catch {
      return null
    }
  }

  private async extractLeadership(
    leadershipUrl: string,
    companyUrl: string,
    config: ScraperConfig
  ): Promise<ProspectData[]> {
    const prospects: ProspectData[] = []

    await this.withPage(async (page: Page) => {
      await page.goto(leadershipUrl, { waitUntil: 'networkidle0', timeout: 30000 })
      await this.delay(2000)

      // Extract company name from page if possible
      const companyName = await this.extractCompanyName(page, companyUrl)

      // Common selectors for team member cards
      const cardSelectors = [
        '.team-member',
        '.leader-card',
        '.executive',
        '.leadership-card',
        '[class*="team-member"]',
        '[class*="leader"]',
        '[class*="executive"]',
        '.person',
        '.staff-member',
        '.bio-card',
      ]

      for (const cardSelector of cardSelectors) {
        const cards = await page.$$(cardSelector)
        if (cards.length === 0) continue

        for (const card of cards) {
          try {
            // Try multiple selectors for each field
            const name = await this.extractFromCard(card, page, [
              'h2',
              'h3',
              'h4',
              '.name',
              '[class*="name"]',
              '.title-name',
            ])

            const title = await this.extractFromCard(card, page, [
              '.title',
              '.position',
              '.role',
              '[class*="title"]',
              '[class*="position"]',
              'p:first-of-type',
            ])

            const linkedin = await this.extractHrefFromCard(card, page, 'a[href*="linkedin"]')

            if (name && this.isTargetRole(title)) {
              if (this.matchesKeywords(name + ' ' + title, config.keywords)) {
                prospects.push({
                  full_name: name,
                  title: title || undefined,
                  company: companyName || undefined,
                  linkedin_url: linkedin || undefined,
                  source_url: leadershipUrl,
                  source_type: 'company_leadership',
                  raw_data: {
                    company_website: companyUrl,
                  },
                })
              }
            }
          } catch {
            // Skip failed cards
          }
        }

        // If we found cards, don't try other selectors
        if (prospects.length > 0) break
      }

      // If no cards found, try extracting from page content
      if (prospects.length === 0) {
        const content = await page.content()
        const extracted = this.extractFromContent(content, companyName, leadershipUrl, config)
        prospects.push(...extracted)
      }
    })

    return prospects
  }

  private async extractFromCard(
    card: import('puppeteer').ElementHandle<Element>,
    page: Page,
    selectors: string[]
  ): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const element = await card.$(selector)
        if (element) {
          const text = await page.evaluate((el: Element) => el.textContent?.trim() || '', element)
          if (text && text.length > 1 && text.length < 100) {
            return text
          }
        }
      } catch {
        // Try next selector
      }
    }
    return null
  }

  private async extractHrefFromCard(
    card: import('puppeteer').ElementHandle<Element>,
    page: Page,
    selector: string
  ): Promise<string | null> {
    try {
      const element = await card.$(selector)
      if (element) {
        return await page.evaluate((el: Element) => (el as HTMLAnchorElement).href, element)
      }
    } catch {
      // Return null
    }
    return null
  }

  private async extractCompanyName(page: Page, fallbackUrl: string): Promise<string | null> {
    // Try to extract from meta tags or page title
    const sources = [
      () => page.$eval('meta[property="og:site_name"]', (el: Element) => (el as HTMLMetaElement).content),
      () => page.$eval('meta[name="application-name"]', (el: Element) => (el as HTMLMetaElement).content),
      () => page.$eval('.logo img', (el: Element) => (el as HTMLImageElement).alt),
      () =>
        page.$eval('title', (el: Element) => {
          const title = el.textContent || ''
          // Often "About | Company Name"
          const parts = title.split(/[|–-]/)
          return parts[parts.length - 1]?.trim() || null
        }),
    ]

    for (const source of sources) {
      try {
        const name = await source()
        if (name && name.length > 2) {
          return this.normalizeCompany(name)
        }
      } catch {
        // Try next source
      }
    }

    // Fall back to extracting from URL
    try {
      const urlObj = new URL(fallbackUrl)
      const hostname = urlObj.hostname.replace('www.', '')
      const name = hostname.split('.')[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    } catch {
      return null
    }
  }

  private extractFromContent(
    html: string,
    companyName: string | null,
    sourceUrl: string,
    config: ScraperConfig
  ): ProspectData[] {
    const prospects: ProspectData[] = []
    const found = new Set<string>()

    // Pattern: "Name, Title"
    const pattern =
      /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(CEO|CTO|CFO|COO|President|Vice President|VP|SVP|EVP|Director|Head of[^,<]+|Chief[^,<]+|Managing Director|General Manager|Founder|Co-Founder)/gi

    let match
    while ((match = pattern.exec(html)) !== null) {
      const name = match[1].trim()
      const title = match[2].trim()
      const key = name.toLowerCase()

      if (!found.has(key)) {
        found.add(key)

        if (this.matchesKeywords(name + ' ' + title, config.keywords)) {
          prospects.push({
            full_name: name,
            title: title,
            company: companyName || undefined,
            source_url: sourceUrl,
            source_type: 'company_leadership',
          })
        }
      }
    }

    return prospects
  }

  private isTargetRole(title: string | null): boolean {
    if (!title) return false
    const lowerTitle = title.toLowerCase()
    return this.targetRoles.some((role) => lowerTitle.includes(role))
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    if (keywords.length === 0) return true
    const lowerText = text.toLowerCase()
    return keywords.some((kw) => lowerText.includes(kw.toLowerCase()))
  }
}
