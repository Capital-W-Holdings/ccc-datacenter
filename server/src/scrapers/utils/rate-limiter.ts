import { createLogger } from '../../utils/logger.js'

const logger = createLogger({ module: 'rate-limiter' })

interface RateLimitConfig {
  requestsPerMinute: number
  minDelayMs?: number
  maxDelayMs?: number
}

interface DomainState {
  lastRequestTime: number
  requestCount: number
  windowStart: number
}

/**
 * Per-domain rate limiter for respectful scraping
 */
export class ScraperRateLimiter {
  private domains: Map<string, DomainState> = new Map()
  private defaultConfig: RateLimitConfig = {
    requestsPerMinute: 30,
    minDelayMs: 1000,
    maxDelayMs: 5000,
  }
  private domainConfigs: Map<string, RateLimitConfig> = new Map()

  constructor(defaultConfig?: Partial<RateLimitConfig>) {
    if (defaultConfig) {
      this.defaultConfig = { ...this.defaultConfig, ...defaultConfig }
    }
  }

  /**
   * Set rate limit config for a specific domain
   */
  setDomainConfig(domain: string, config: Partial<RateLimitConfig>): void {
    this.domainConfigs.set(domain, { ...this.defaultConfig, ...config })
  }

  /**
   * Get config for a domain
   */
  private getConfig(domain: string): RateLimitConfig {
    return this.domainConfigs.get(domain) || this.defaultConfig
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  /**
   * Wait for rate limit before making a request
   * Returns the delay that was applied
   */
  async waitForSlot(url: string): Promise<number> {
    const domain = this.extractDomain(url)
    const config = this.getConfig(domain)
    const now = Date.now()

    let state = this.domains.get(domain)
    if (!state) {
      state = {
        lastRequestTime: 0,
        requestCount: 0,
        windowStart: now,
      }
      this.domains.set(domain, state)
    }

    // Reset window if minute has passed
    if (now - state.windowStart >= 60000) {
      state.requestCount = 0
      state.windowStart = now
    }

    // Check if we've hit the rate limit
    if (state.requestCount >= config.requestsPerMinute) {
      const waitTime = 60000 - (now - state.windowStart)
      logger.info({ domain, waitTime }, 'Rate limit reached, waiting')
      await this.delay(waitTime)
      state.requestCount = 0
      state.windowStart = Date.now()
    }

    // Calculate delay based on last request
    const timeSinceLastRequest = now - state.lastRequestTime
    const minDelay = config.minDelayMs || 1000
    const maxDelay = config.maxDelayMs || 5000

    if (timeSinceLastRequest < minDelay) {
      // Add some randomness to delay
      const jitter = Math.random() * (maxDelay - minDelay)
      const delay = minDelay - timeSinceLastRequest + jitter
      logger.debug({ domain, delay }, 'Adding delay between requests')
      await this.delay(delay)
    }

    // Update state
    state.lastRequestTime = Date.now()
    state.requestCount++

    return Date.now() - now
  }

  /**
   * Get current rate limit status for a domain
   */
  getStatus(url: string): { remaining: number; resetsIn: number } {
    const domain = this.extractDomain(url)
    const config = this.getConfig(domain)
    const state = this.domains.get(domain)

    if (!state) {
      return { remaining: config.requestsPerMinute, resetsIn: 0 }
    }

    const now = Date.now()
    const windowAge = now - state.windowStart

    if (windowAge >= 60000) {
      return { remaining: config.requestsPerMinute, resetsIn: 0 }
    }

    return {
      remaining: Math.max(0, config.requestsPerMinute - state.requestCount),
      resetsIn: Math.ceil((60000 - windowAge) / 1000),
    }
  }

  /**
   * Reset rate limit for a domain
   */
  reset(url?: string): void {
    if (url) {
      const domain = this.extractDomain(url)
      this.domains.delete(domain)
    } else {
      this.domains.clear()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const scraperRateLimiter = new ScraperRateLimiter()

// Pre-configure known domains
scraperRateLimiter.setDomainConfig('linkedin.com', { requestsPerMinute: 10, minDelayMs: 3000 })
scraperRateLimiter.setDomainConfig('www.linkedin.com', { requestsPerMinute: 10, minDelayMs: 3000 })
scraperRateLimiter.setDomainConfig('datacenterdynamics.com', { requestsPerMinute: 20, minDelayMs: 2000 })
scraperRateLimiter.setDomainConfig('datacenterknowledge.com', { requestsPerMinute: 20, minDelayMs: 2000 })
