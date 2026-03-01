import { BaseScraper, ScraperConfig, ProspectData, ScraperProgress } from '../base.js'
import { scraperRateLimiter } from '../utils/rate-limiter.js'
import { Page } from 'puppeteer'

/**
 * Scraper for Data Center Knowledge news
 * Extracts mentioned executives and companies from articles
 */
export class DataCenterKnowledgeScraper extends BaseScraper {
  readonly name = 'Data Center Knowledge'
  readonly type = 'news' as const
  readonly description = 'Extract executives and companies mentioned in Data Center Knowledge articles'

  private baseUrl = 'https://www.datacenterknowledge.com'

  async *scrape(
    config: ScraperConfig,
    onProgress?: (progress: ScraperProgress) => void
  ): AsyncGenerator<ProspectData> {
    const urls =
      config.urls.length > 0
        ? config.urls
        : [`${this.baseUrl}/data-center-news`, `${this.baseUrl}/cloud-computing`]

    const maxPages = config.pagination?.max_pages || 5
    let currentItem = 0
    let totalItems = 0

    for (const url of urls) {
      const canScrape = await this.canScrape(url)
      if (!canScrape) {
        this.logger.warn({ url }, 'Blocked by robots.txt')
        continue
      }

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const pageUrl = pageNum === 1 ? url : `${url}/page/${pageNum}`

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
                  message: `Processing: ${prospect.full_name}`,
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
        'article a, .article-title a, .entry-title a, h2 a, h3 a',
        (els: Element[]) =>
          els
            .map((el) => (el as HTMLAnchorElement).href)
            .filter(
              (href) =>
                href &&
                (href.includes('/article/') ||
                  href.includes('/news/') ||
                  href.includes('/feature/'))
            )
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

      const title = await page.$eval('h1', (el: Element) => el.textContent?.trim() || '').catch(() => '')

      const content = await page.$eval(
        '.article-content, .entry-content, article',
        (el: Element) => el.textContent || ''
      ).catch(() => '')

      // Executive mention patterns
      const execPatterns = [
        /([A-Z][a-z]+ [A-Z][a-z]+),\s*(CEO|CTO|CFO|COO|President|Vice President|VP|SVP|EVP|Director|Head of|Chief)[^.]*(?:at|of|for)\s+([A-Z][A-Za-z0-9\s&.-]+)/gi,
        /(?:said|says|according to)\s+([A-Z][a-z]+ [A-Z][a-z]+),\s*(CEO|CTO|CFO|COO|President|VP|Director)/gi,
        /(CEO|CTO|CFO|COO|President)\s+([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:of|at)\s+([A-Z][A-Za-z\s&]+)/gi,
      ]

      const found = new Set<string>()

      for (const pattern of execPatterns) {
        let match
        while ((match = pattern.exec(content)) !== null) {
          let name: string
          let role: string
          let company: string | undefined

          // Determine structure based on pattern
          if (match[0].toLowerCase().includes('said') || match[0].toLowerCase().includes('according')) {
            name = match[1]
            role = match[2]
          } else if (/^(CEO|CTO|CFO)/i.test(match[1])) {
            role = match[1]
            name = match[2]
            company = match[3]?.trim()
          } else {
            name = match[1]
            role = match[2]
            company = match[3]?.trim()
          }

          const key = name.toLowerCase()
          if (!found.has(key)) {
            found.add(key)

            if (this.matchesKeywords(name + ' ' + role + ' ' + (company || ''), config.keywords)) {
              prospects.push({
                full_name: name.trim(),
                title: role.trim() || undefined,
                company: company ? this.normalizeCompany(company) : undefined,
                source_url: url,
                source_type: 'news_mention',
                raw_data: {
                  article_title: title,
                },
              })
            }
          }
        }
      }

      // Company mentions
      const companyKeywords = [
        'data center',
        'datacenter',
        'hyperscale',
        'colocation',
        'cloud provider',
        'infrastructure',
      ]
      const companyPattern = new RegExp(
        `((?:[A-Z][A-Za-z0-9]*\\s*)+)(?:\\s+(?:${companyKeywords.join('|')}))|(?:${companyKeywords.join('|')})\\s+(?:company|provider|operator)\\s+((?:[A-Z][A-Za-z0-9]*\\s*)+)`,
        'gi'
      )

      let companyMatch
      while ((companyMatch = companyPattern.exec(content)) !== null) {
        const company = (companyMatch[1] || companyMatch[2])?.trim()
        if (company && !found.has(company.toLowerCase()) && company.length > 3) {
          found.add(company.toLowerCase())

          if (this.matchesKeywords(company, config.keywords)) {
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
