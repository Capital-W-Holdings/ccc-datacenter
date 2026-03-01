import { BaseScraper, ScraperType } from './base.js'
import { DataCentersWorldScraper } from './conference/datacenters-world.js'
import { DCDConnectScraper } from './conference/dcd-conference.js'
import { DataCenterDynamicsScraper } from './news/datacenter-dynamics.js'
import { DataCenterKnowledgeScraper } from './news/data-center-knowledge.js'
import { LeadershipExtractorScraper } from './company/leadership-extractor.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger({ module: 'scraper-registry' })

/**
 * Scraper registry for managing available scrapers
 */
class ScraperRegistry {
  private scrapers: Map<string, BaseScraper> = new Map()

  constructor() {
    // Register all available scrapers
    this.register(new DataCentersWorldScraper())
    this.register(new DCDConnectScraper())
    this.register(new DataCenterDynamicsScraper())
    this.register(new DataCenterKnowledgeScraper())
    this.register(new LeadershipExtractorScraper())

    logger.info({ count: this.scrapers.size }, 'Scraper registry initialized')
  }

  /**
   * Register a scraper
   */
  register(scraper: BaseScraper): void {
    const id = this.generateId(scraper.name)
    this.scrapers.set(id, scraper)
    logger.debug({ id, name: scraper.name, type: scraper.type }, 'Scraper registered')
  }

  /**
   * Get scraper by ID
   */
  get(id: string): BaseScraper | undefined {
    return this.scrapers.get(id)
  }

  /**
   * Get all scrapers
   */
  getAll(): { id: string; scraper: BaseScraper }[] {
    return Array.from(this.scrapers.entries()).map(([id, scraper]) => ({
      id,
      scraper,
    }))
  }

  /**
   * Get scrapers by type
   */
  getByType(type: ScraperType): { id: string; scraper: BaseScraper }[] {
    return this.getAll().filter(({ scraper }) => scraper.type === type)
  }

  /**
   * Get scraper info for API responses
   */
  getScraperInfo(): Array<{
    id: string
    name: string
    type: ScraperType
    description: string
  }> {
    return this.getAll().map(({ id, scraper }) => ({
      id,
      name: scraper.name,
      type: scraper.type,
      description: scraper.description,
    }))
  }

  /**
   * Generate consistent ID from name
   */
  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

// Singleton instance
export const scraperRegistry = new ScraperRegistry()

/**
 * Get scraper by ID (convenience function)
 */
export function getScraperById(id: string): BaseScraper | undefined {
  return scraperRegistry.get(id)
}

/**
 * Get all available scrapers
 */
export function getAllScrapers(): Array<{
  id: string
  name: string
  type: ScraperType
  description: string
}> {
  return scraperRegistry.getScraperInfo()
}
