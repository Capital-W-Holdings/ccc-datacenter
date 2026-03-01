import { BaseScraper, ScraperConfig, ProspectData, ScraperProgress } from '../base.js'
import { scraperRateLimiter } from '../utils/rate-limiter.js'
import { Page } from 'puppeteer'

/**
 * Scraper for DataCenter Dynamics news
 * Extracts mentioned executives and companies from articles
 */
export class DataCenterDynamicsScraper extends BaseScraper {
  readonly name = 'DataCenter Dynamics'
  readonly type = 'news' as const
  readonly description = 'Extract executives and companies mentioned in DataCenter Dynamics articles'

  private baseUrl = 'https://www.datacenterdynamics.com'

  async *scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData> {
    const urls =
      config.urls.length > 0
        ? config.urls
        : [
            `${this.baseUrl}/en/news/`,
            `${this.baseUrl}/en/news/enterprise/`,
            `${this.baseUrl}/en/news/colocation/`,
          ]

    const maxPages = config.pagination?.max_pages || 5
    let currentItem = 0
    let totalItems = 0

    for (const url of urls) {
      // Check robots.txt
      const canScrape = await this.canScrape(url)
      if (!canScrape) {
        this.logger.warn({ url }, 'Blocked by robots.txt')
        continue
      }

      // Scrape article listing pages
      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = page === 1 ? url : `${url}?page=${page}`

        await scraperRateLimiter.waitForSlot(pageUrl)

        try {
          const articleUrls = await this.getArticleUrls(pageUrl)
          totalItems += articleUrls.length

          for (const articleUrl of articleUrls) {
            await scraperRateLimiter.waitForSlot(articleUrl)

            const prospects = await this.scrapeArticle(articleUrl, config)

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
            { url: pageUrl, error: error instanceof Error ? error.message : 'Unknown error' },
            'Failed to scrape page'
          )
        }
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

  private async getArticleUrls(listingUrl: string): Promise<string[]> {
    const urls: string[] = []

    await this.withPage(async (page: Page) => {
      await page.goto(listingUrl, { waitUntil: 'networkidle0', timeout: 30000 })
      await this.delay(2000)

      const links = await page.$$eval(
        'article a[href*="/en/news/"], .article-card a, .news-item a',
        (els: Element[]) =>
          els
            .map((el) => (el as HTMLAnchorElement).href)
            .filter((href) => href && href.includes('/en/news/') && !href.endsWith('/news/'))
      )

      urls.push(...[...new Set(links)].slice(0, 10))
    })

    return urls
  }

  private async scrapeArticle(url: string, config: ScraperConfig): Promise<ProspectData[]> {
    const prospects: ProspectData[] = []

    await this.withPage(async (page: Page) => {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
      await this.delay(2000)

      // Get article title for context
      const title = await page.$eval('h1', (el: Element) => el.textContent?.trim() || '').catch(() => '')

      // Get article content
      const content = await page.$eval(
        'article, .article-content, .article-body',
        (el: Element) => el.textContent || ''
      ).catch(() => '')

      // Extract people mentioned
      const peoplePatterns = [
        // "John Smith, CEO of Company"
        /([A-Z][a-z]+ [A-Z][a-z]+),\s*(CEO|CTO|CFO|COO|President|VP|Director|Head|Chief|Managing Director|General Manager)[^,]*(?:of|at)\s+([A-Z][A-Za-z\s&]+)/gi,
        // "CEO John Smith"
        /(CEO|CTO|CFO|COO|President|VP|Director|Chief)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
        // "John Smith said" patterns with titles
        /([A-Z][a-z]+ [A-Z][a-z]+),\s*(CEO|CTO|CFO|COO|President|VP|Director)[^.]*said/gi,
      ]

      const found = new Set<string>()

      for (const pattern of peoplePatterns) {
        let match
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1] || match[2]
          if (!found.has(key.toLowerCase())) {
            found.add(key.toLowerCase())

            // Determine name and title based on match structure
            let name: string
            let role: string
            let company: string | undefined

            if (match[3]) {
              // First pattern: "Name, Title of Company"
              name = match[1]
              role = match[2]
              company = match[3].trim()
            } else if (match[1].match(/^(CEO|CTO|CFO|COO|President|VP|Director|Chief)/i)) {
              // Second pattern: "Title Name"
              role = match[1]
              name = match[2]
            } else {
              name = match[1]
              role = match[2] || ''
            }

            if (name && this.matchesKeywords(name + ' ' + role + ' ' + (company || ''), config.keywords)) {
              prospects.push({
                full_name: name.trim(),
                title: role.trim() || undefined,
                company: company ? this.normalizeCompany(company) : undefined,
                source_url: url,
                source_type: 'news_mention',
                raw_data: {
                  article_title: title,
                  mention_context: match[0].slice(0, 200),
                },
              })
            }
          }
        }
      }

      // Extract company mentions for leadership research
      const companyPatterns = [
        /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(?:announced|unveiled|launched|opened|expanded|invested|acquired)/gi,
        /data center (?:provider|operator|company)\s+([A-Z][A-Za-z\s&]+)/gi,
      ]

      for (const pattern of companyPatterns) {
        let match
        while ((match = pattern.exec(content)) !== null) {
          const company = match[1].trim()
          if (!found.has(company.toLowerCase()) && this.matchesKeywords(company, config.keywords)) {
            found.add(company.toLowerCase())
            prospects.push({
              full_name: `[Company] ${this.normalizeCompany(company)}`,
              company: this.normalizeCompany(company),
              source_url: url,
              source_type: 'news_company',
              raw_data: {
                article_title: title,
                needs_leadership_extraction: true,
              },
            })
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
