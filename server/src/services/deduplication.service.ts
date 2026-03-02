import Fuse from 'fuse.js'
import { createLogger } from '../utils/logger.js'
import { supabase } from '../db/index.js'

const logger = createLogger({ module: 'deduplication' })

export interface ProspectRecord {
  id: string
  full_name: string
  email?: string | null
  company?: string | null
  linkedin_url?: string | null
}

export interface DuplicateMatch {
  existingId: string
  score: number
  matchType: 'exact_email' | 'exact_linkedin' | 'fuzzy_name_company'
  matchedFields: string[]
}

export interface DeduplicationResult {
  isNew: boolean
  duplicates: DuplicateMatch[]
  bestMatch?: DuplicateMatch
}

/**
 * Deduplication service for prospect records
 * Uses multiple strategies to identify potential duplicates
 */
export class DeduplicationService {
  private cache: Map<string, ProspectRecord[]> = new Map()
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes
  private lastCacheUpdate: number = 0

  /**
   * Check if a prospect is a duplicate
   */
  async checkDuplicate(prospect: {
    full_name: string
    email?: string | null
    company?: string | null
    linkedin_url?: string | null
  }): Promise<DeduplicationResult> {
    const duplicates: DuplicateMatch[] = []

    // 1. Check exact email match (100% duplicate)
    if (prospect.email) {
      const emailMatch = await this.findByEmail(prospect.email)
      if (emailMatch) {
        duplicates.push({
          existingId: emailMatch.id,
          score: 100,
          matchType: 'exact_email',
          matchedFields: ['email'],
        })
      }
    }

    // 2. Check exact LinkedIn URL match (100% duplicate)
    if (prospect.linkedin_url) {
      const linkedinMatch = await this.findByLinkedIn(prospect.linkedin_url)
      if (linkedinMatch) {
        duplicates.push({
          existingId: linkedinMatch.id,
          score: 100,
          matchType: 'exact_linkedin',
          matchedFields: ['linkedin_url'],
        })
      }
    }

    // 3. Check fuzzy name + company match
    if (prospect.company) {
      const fuzzyMatches = await this.findFuzzyMatches(
        prospect.full_name,
        prospect.company
      )
      duplicates.push(...fuzzyMatches)
    }

    // 4. Name-only matching is TOO AGGRESSIVE - disabled
    // It was marking "John Smith at Google" as duplicate of "John Smith at AWS"
    // Only email, LinkedIn, or name+company should count as duplicates

    // Sort by score
    duplicates.sort((a, b) => b.score - a.score)

    // Log what we found for debugging
    if (duplicates.length > 0) {
      logger.debug({
        prospect: prospect.full_name,
        company: prospect.company,
        duplicateCount: duplicates.length,
        bestMatch: duplicates[0],
      }, 'Found potential duplicate')
    }

    return {
      isNew: duplicates.length === 0,
      duplicates,
      bestMatch: duplicates[0],
    }
  }

  /**
   * Batch check for duplicates
   */
  async batchCheckDuplicates(
    prospects: Array<{
      full_name: string
      email?: string | null
      company?: string | null
      linkedin_url?: string | null
    }>
  ): Promise<Map<number, DeduplicationResult>> {
    const results = new Map<number, DeduplicationResult>()

    // Refresh cache before batch processing
    await this.refreshCache()

    for (let i = 0; i < prospects.length; i++) {
      const result = await this.checkDuplicate(prospects[i])
      results.set(i, result)
    }

    return results
  }

  /**
   * Find prospect by exact email match
   */
  private async findByEmail(email: string): Promise<ProspectRecord | null> {
    const { data, error } = await supabase
      .from('prospects')
      .select('id, full_name, email, company, linkedin_url')
      .eq('email', email.toLowerCase())
      .limit(1)
      .single()

    if (error || !data) return null
    return data as ProspectRecord
  }

  /**
   * Find prospect by exact LinkedIn URL match
   */
  private async findByLinkedIn(linkedinUrl: string): Promise<ProspectRecord | null> {
    // Normalize LinkedIn URL
    const normalized = this.normalizeLinkedIn(linkedinUrl)
    if (!normalized) return null

    const { data, error } = await supabase
      .from('prospects')
      .select('id, full_name, email, company, linkedin_url')
      .ilike('linkedin_url', `%${normalized}%`)
      .limit(1)
      .single()

    if (error || !data) return null
    return data as ProspectRecord
  }

  /**
   * Find fuzzy matches by name and company
   */
  private async findFuzzyMatches(
    name: string,
    company: string
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = []
    const existingProspects = await this.getProspectsCache()

    // Filter to same company first
    const sameCompany = existingProspects.filter((p) =>
      p.company && this.normalizeCompany(p.company) === this.normalizeCompany(company)
    )

    if (sameCompany.length === 0) return matches

    // Fuzzy search on names
    const fuse = new Fuse(sameCompany, {
      keys: ['full_name'],
      threshold: 0.3, // 70% similarity
      includeScore: true,
    })

    const results = fuse.search(name)

    for (const result of results) {
      if (result.score !== undefined && result.score <= 0.15) {
        // 85%+ match
        matches.push({
          existingId: result.item.id,
          score: Math.round((1 - result.score) * 100),
          matchType: 'fuzzy_name_company',
          matchedFields: ['full_name', 'company'],
        })
      }
    }

    return matches
  }

  // findFuzzyNameMatches removed - was too aggressive
  // It marked "John Smith at Google" as duplicate of "John Smith at AWS"
  // Deduplication now requires: exact email, exact LinkedIn, or name+company match

  /**
   * Get or refresh prospects cache
   */
  private async getProspectsCache(): Promise<ProspectRecord[]> {
    const now = Date.now()
    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      await this.refreshCache()
    }

    return this.cache.get('all') || []
  }

  /**
   * Refresh the prospects cache
   */
  private async refreshCache(): Promise<void> {
    logger.debug('Refreshing prospects cache')

    const { data, error } = await supabase
      .from('prospects')
      .select('id, full_name, email, company, linkedin_url')
      .order('created_at', { ascending: false })
      .limit(10000) // Reasonable limit for in-memory fuzzy matching

    if (error) {
      logger.error({ error: error.message }, 'Failed to refresh cache')
      return
    }

    this.cache.set('all', data as ProspectRecord[])
    this.lastCacheUpdate = Date.now()
    logger.debug({ count: data.length }, 'Cache refreshed')
  }

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.cache.clear()
    this.lastCacheUpdate = 0
  }

  /**
   * Normalize LinkedIn URL
   */
  private normalizeLinkedIn(url: string): string | null {
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)
    return match ? match[1].toLowerCase() : null
  }

  /**
   * Normalize company name for comparison
   */
  private normalizeCompany(company: string): string {
    return company
      .toLowerCase()
      .replace(/[,.\s]+/g, '')
      .replace(/(inc|llc|ltd|corp|corporation|company|co)$/i, '')
      .trim()
  }
}

// Singleton instance
export const deduplicationService = new DeduplicationService()
