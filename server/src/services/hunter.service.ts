import { createLogger } from '../utils/logger.js'
import { supabase } from '../db/index.js'
import crypto from 'crypto'

const logger = createLogger({ module: 'hunter-service' })

// ============================================================================
// Types
// ============================================================================

export interface HunterEmailResult {
  email: string | null
  score: number
  verified: boolean
  verificationStatus?: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown'
  position?: string
  linkedin?: string
  sources: number
  source: 'hunter' | 'pattern' | 'cache'
}

export interface HunterQuota {
  used: number
  limit: number
  remaining: number
  resetAt: Date | null
}

export interface DomainSearchResult {
  domain: string
  organization: string
  emails: Array<{
    email: string
    firstName: string
    lastName: string
    position: string
    confidence: number
  }>
  totalEmails: number
}

interface HunterEmailFinderResponse {
  data: {
    first_name: string
    last_name: string
    email: string | null
    score: number
    domain: string
    accept_all: boolean
    position?: string
    twitter?: string
    linkedin_url?: string
    phone_number?: string
    company?: string
    sources: Array<{
      domain: string
      uri: string
      extracted_on: string
      last_seen_on: string
      still_on_page: boolean
    }>
    verification?: {
      date: string
      status: string
    }
  }
  meta: {
    params: Record<string, string>
  }
}

interface HunterVerifyResponse {
  data: {
    status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown'
    result: string
    score: number
    email: string
    regexp: boolean
    gibberish: boolean
    disposable: boolean
    webmail: boolean
    mx_records: boolean
    smtp_server: boolean
    smtp_check: boolean
    accept_all: boolean
    block: boolean
    sources: Array<{
      domain: string
      uri: string
    }>
  }
}

interface HunterAccountResponse {
  data: {
    email: string
    plan_name: string
    plan_level: number
    reset_date: string
    team_id: number
    calls: {
      used: number
      available: number
    }
  }
}

interface HunterDomainSearchResponse {
  data: {
    domain: string
    disposable: boolean
    webmail: boolean
    accept_all: boolean
    pattern: string
    organization: string
    description: string
    emails: Array<{
      value: string
      type: string
      confidence: number
      first_name: string
      last_name: string
      position: string
      seniority: string
      department: string
      linkedin: string
      twitter: string
      phone_number: string
    }>
  }
  meta: {
    results: number
    limit: number
    offset: number
    params: Record<string, string>
  }
}

// ============================================================================
// Well-known company domains (for better domain extraction)
// ============================================================================

const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  // Hyperscalers
  'amazon': 'amazon.com',
  'aws': 'amazon.com',
  'amazon web services': 'amazon.com',
  'google': 'google.com',
  'google cloud': 'google.com',
  'gcp': 'google.com',
  'microsoft': 'microsoft.com',
  'azure': 'microsoft.com',
  'meta': 'meta.com',
  'facebook': 'meta.com',
  'oracle': 'oracle.com',
  'oracle cloud': 'oracle.com',
  'ibm': 'ibm.com',
  'alibaba': 'alibaba-inc.com',
  'alibaba cloud': 'alibaba-inc.com',
  'apple': 'apple.com',
  'nvidia': 'nvidia.com',
  'salesforce': 'salesforce.com',

  // Data Center Operators
  'equinix': 'equinix.com',
  'digital realty': 'digitalrealty.com',
  'digitalrealty': 'digitalrealty.com',
  'cyrusone': 'cyrusone.com',
  'cyrus one': 'cyrusone.com',
  'coresite': 'coresite.com',
  'core site': 'coresite.com',
  'qts': 'qtsdatacenters.com',
  'qts realty': 'qtsdatacenters.com',
  'qts data centers': 'qtsdatacenters.com',
  'vantage': 'vantage-dc.com',
  'vantage data centers': 'vantage-dc.com',
  'flexential': 'flexential.com',
  'databank': 'databank.com',
  'data bank': 'databank.com',
  'compass datacenters': 'compassdatacenters.com',
  'compass data centers': 'compassdatacenters.com',
  'stack infrastructure': 'stackinfra.com',
  'aligned': 'alignedenergy.com',
  'aligned data centers': 'alignedenergy.com',
  'aligned energy': 'alignedenergy.com',
  'edgeconnex': 'edgeconnex.com',
  'edge connex': 'edgeconnex.com',
  'switch': 'switch.com',
  'ntt': 'ntt.com',
  'ntt global': 'ntt.com',
  'ntt data': 'nttdata.com',
  't5 data centers': 't5datacenters.com',
  't5': 't5datacenters.com',
  'stream data centers': 'streamdatacenters.com',
  'stream': 'streamdatacenters.com',
  'serverfarm': 'serverfarmllc.com',
  'server farm': 'serverfarmllc.com',
  'prime data centers': 'primedatacenters.com',
  'prime': 'primedatacenters.com',
  'tierpoint': 'tierpoint.com',
  'tier point': 'tierpoint.com',
  'h5 data centers': 'h5datacenters.com',
  'h5': 'h5datacenters.com',
  'skybox datacenters': 'skyboxdatacenters.com',
  'skybox': 'skyboxdatacenters.com',
  'element critical': 'elementcritical.com',
  'datacenter hawk': 'datacenterhawk.com',
  'yondr': 'yondrgroup.com',
  'yondr group': 'yondrgroup.com',
  'prologis': 'prologis.com',

  // Construction
  'turner': 'turnerconstruction.com',
  'turner construction': 'turnerconstruction.com',
  'mortenson': 'mortenson.com',
  'holder': 'holder.com',
  'holder construction': 'holder.com',
  'dpr': 'dpr.com',
  'dpr construction': 'dpr.com',
  'skanska': 'usa.skanska.com',
  'hensel phelps': 'henselphelps.com',
  'whiting-turner': 'whiting-turner.com',
  'whiting turner': 'whiting-turner.com',
  'mccarthy': 'mccarthy.com',
  'mccarthy building': 'mccarthy.com',
  'gilbane': 'gilbaneco.com',
  'gilbane building': 'gilbaneco.com',
  'balfour beatty': 'balfourbeattyus.com',
  'rosendin': 'rosendin.com',
  'rosendin electric': 'rosendin.com',
  'fortis construction': 'fortisconstruction.com',
  'fortis': 'fortisconstruction.com',
  'clune': 'clunegc.com',
  'clune construction': 'clunegc.com',
  'structure tone': 'structuretone.com',
  'aecom': 'aecom.com',
  'jacobs': 'jacobs.com',
  'hdr': 'hdrinc.com',
  'hdr inc': 'hdrinc.com',
  'gensler': 'gensler.com',
  'kiewit': 'kiewit.com',
  'us engineering': 'usengineering.com',
  'u.s. engineering': 'usengineering.com',

  // Brokers
  'cbre': 'cbre.com',
  'jll': 'jll.com',
  'jones lang lasalle': 'jll.com',
  'cushman wakefield': 'cushmanwakefield.com',
  'cushman & wakefield': 'cushmanwakefield.com',
  'newmark': 'nmrk.com',
  'newmark knight frank': 'nmrk.com',
  'colliers': 'colliers.com',
  'savills': 'savills.com',

  // Investors
  'blackstone': 'blackstone.com',
  'kkr': 'kkr.com',
  'brookfield': 'brookfield.com',
  'carlyle': 'carlyle.com',
  'tpg': 'tpg.com',
  'silver lake': 'silverlake.com',
  'macquarie': 'macquarie.com',
  'gic': 'gic.com.sg',
  'axa': 'axa-im.com',
  'stonepeak': 'stonepeak.com',
  'stonepeak partners': 'stonepeak.com',
  'digital bridge': 'digitalbridge.com',
  'digitalbridge': 'digitalbridge.com',
  'american tower': 'americantower.com',
  'crown castle': 'crowncastle.com',
  'sdcl': 'sdcl-ib.com',

  // Engineering & Consulting
  'hatch': 'hatch.com',
  'burns & mcdonnell': 'burnsmcd.com',
  'burns and mcdonnell': 'burnsmcd.com',
  'mckinstry': 'mckinstry.com',
  'lendlease': 'lendlease.com',
  'lend lease': 'lendlease.com',
}

// Common email patterns to try as fallback
const EMAIL_PATTERNS = [
  (first: string, last: string, domain: string) => `${first}.${last}@${domain}`,
  (first: string, last: string, domain: string) => `${first[0]}${last}@${domain}`,
  (first: string, last: string, domain: string) => `${first}${last[0]}@${domain}`,
  (first: string, _last: string, domain: string) => `${first}@${domain}`,
  (first: string, last: string, domain: string) => `${first}_${last}@${domain}`,
  (first: string, last: string, domain: string) => `${first}-${last}@${domain}`,
  (first: string, last: string, domain: string) => `${last}.${first}@${domain}`,
  (first: string, last: string, domain: string) => `${first[0]}.${last}@${domain}`,
]

// ============================================================================
// Cache Functions
// ============================================================================

function generateCacheKey(firstName: string, lastName: string, domain: string): string {
  const normalized = `${firstName.toLowerCase().trim()}|${lastName.toLowerCase().trim()}|${domain.toLowerCase().trim()}`
  return crypto.createHash('md5').update(normalized).digest('hex')
}

async function getCachedResult(firstName: string, lastName: string, domain: string): Promise<HunterEmailResult | null> {
  const cacheKey = generateCacheKey(firstName, lastName, domain)

  const { data, error } = await supabase
    .from('hunter_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return null
  }

  logger.debug({ firstName, lastName, domain }, 'Hunter cache hit')

  return {
    email: data.email,
    score: data.confidence,
    verified: data.verified,
    position: data.position,
    linkedin: data.linkedin_url,
    sources: data.sources,
    source: 'cache',
  }
}

async function cacheResult(
  firstName: string,
  lastName: string,
  domain: string,
  result: HunterEmailResult | null
): Promise<void> {
  const cacheKey = generateCacheKey(firstName, lastName, domain)

  try {
    await supabase.from('hunter_cache').upsert({
      cache_key: cacheKey,
      first_name: firstName,
      last_name: lastName,
      domain,
      email: result?.email || null,
      confidence: result?.score || 0,
      verified: result?.verified || false,
      linkedin_url: result?.linkedin || null,
      position: result?.position || null,
      sources: result?.sources || 0,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }, {
      onConflict: 'cache_key',
    })
  } catch (error) {
    logger.warn({ error }, 'Failed to cache Hunter result')
  }
}

// ============================================================================
// Domain Extraction
// ============================================================================

export function extractDomain(company: string, website?: string | null): string | null {
  // If we have a website, extract the domain
  if (website) {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`)
      return url.hostname.replace(/^www\./, '')
    } catch {
      // Fall through to company name extraction
    }
  }

  // Check known company domains first
  const companyLower = company.toLowerCase().trim()
  for (const [name, domain] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (companyLower.includes(name) || name.includes(companyLower)) {
      return domain
    }
  }

  // Clean up company name and derive domain
  const cleaned = company
    .toLowerCase()
    .replace(/[,.].*$/, '')                    // Remove suffixes like ", Inc." or ". LLC"
    .replace(/\s+(inc|llc|corp|ltd|co|company|group|partners|holdings|international|intl|usa|us|global|worldwide)\.?$/gi, '')
    .replace(/\s+(and|&)\s+/g, '')            // Remove "and" or "&"
    .replace(/[^a-z0-9\s-]/g, '')             // Remove special chars except space and hyphen
    .replace(/\s+/g, '')                       // Remove spaces
    .trim()

  if (cleaned.length > 2) {
    return `${cleaned}.com`
  }

  return null
}

// ============================================================================
// Quota Management
// ============================================================================

export async function getQuota(apiKey: string): Promise<HunterQuota> {
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/account?api_key=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    )

    if (!response.ok) {
      throw new Error(`Hunter API error: ${response.status}`)
    }

    const data = await response.json() as HunterAccountResponse

    const quota: HunterQuota = {
      used: data.data.calls.used,
      limit: data.data.calls.available + data.data.calls.used,
      remaining: data.data.calls.available,
      resetAt: data.data.reset_date ? new Date(data.data.reset_date) : null,
    }

    // Update quota in database
    await supabase.from('hunter_quota').update({
      used: quota.used,
      limit_total: quota.limit,
      reset_at: quota.resetAt?.toISOString(),
      last_checked: new Date().toISOString(),
    }).eq('id', (await supabase.from('hunter_quota').select('id').single()).data?.id)

    return quota
  } catch (error) {
    logger.error({ error }, 'Failed to fetch Hunter quota')

    // Return cached quota from database
    const { data } = await supabase.from('hunter_quota').select('*').single()
    if (data) {
      return {
        used: data.used,
        limit: data.limit_total,
        remaining: data.limit_total - data.used,
        resetAt: data.reset_at ? new Date(data.reset_at) : null,
      }
    }

    return { used: 0, limit: 0, remaining: 0, resetAt: null }
  }
}

// ============================================================================
// Email Verification
// ============================================================================

export async function verifyEmail(
  email: string,
  apiKey: string
): Promise<{ valid: boolean; score: number; status: string } | null> {
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    )

    if (response.status === 429) {
      logger.warn('Hunter.io rate limit reached during verification')
      return null
    }

    if (!response.ok) {
      return null
    }

    const data = await response.json() as HunterVerifyResponse

    return {
      valid: data.data.status === 'valid',
      score: data.data.score,
      status: data.data.status,
    }
  } catch (error) {
    logger.error({ error, email }, 'Hunter.io email verification failed')
    return null
  }
}

// ============================================================================
// Email Pattern Fallback
// ============================================================================

export function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const first = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const last = lastName.toLowerCase().replace(/[^a-z]/g, '')

  if (!first || !last || !domain) {
    return []
  }

  return EMAIL_PATTERNS.map(pattern => pattern(first, last, domain))
}

export async function tryEmailPatterns(
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string
): Promise<HunterEmailResult | null> {
  const patterns = generateEmailPatterns(firstName, lastName, domain)

  for (const email of patterns.slice(0, 3)) { // Try first 3 patterns only to save quota
    const verification = await verifyEmail(email, apiKey)

    if (verification && verification.valid) {
      logger.info({ email, pattern: true }, 'Found valid email via pattern matching')
      return {
        email,
        score: verification.score,
        verified: true,
        verificationStatus: 'valid',
        sources: 0,
        source: 'pattern',
      }
    }

    // Small delay between verification attempts
    await new Promise(r => setTimeout(r, 300))
  }

  return null
}

// ============================================================================
// Core Email Finder
// ============================================================================

export async function findEmail(
  firstName: string,
  lastName: string,
  company: string,
  apiKey: string,
  options: {
    website?: string | null
    useCache?: boolean
    verifyResult?: boolean
    fallbackToPatterns?: boolean
  } = {}
): Promise<HunterEmailResult | null> {
  const {
    website,
    useCache = true,
    verifyResult = true,
    fallbackToPatterns = true,
  } = options

  const domain = extractDomain(company, website)

  if (!domain) {
    logger.warn({ company }, 'Could not extract domain from company')
    return null
  }

  // Check cache first
  if (useCache) {
    const cached = await getCachedResult(firstName, lastName, domain)
    if (cached) {
      return cached
    }
  }

  try {
    const params = new URLSearchParams({
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey,
    })

    const response = await fetch(
      `https://api.hunter.io/v2/email-finder?${params.toString()}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    )

    if (response.status === 429) {
      logger.warn('Hunter.io rate limit reached')
      return null
    }

    if (!response.ok) {
      const errorText = await response.text()
      logger.warn({ status: response.status, error: errorText }, 'Hunter.io API error')

      // Try pattern fallback on API error
      if (fallbackToPatterns) {
        return tryEmailPatterns(firstName, lastName, domain, apiKey)
      }
      return null
    }

    const data = await response.json() as HunterEmailFinderResponse

    if (!data.data.email) {
      logger.debug({ firstName, lastName, domain }, 'No email found by Hunter.io')

      // Cache the negative result to avoid repeated lookups
      await cacheResult(firstName, lastName, domain, null)

      // Try pattern fallback
      if (fallbackToPatterns) {
        const patternResult = await tryEmailPatterns(firstName, lastName, domain, apiKey)
        if (patternResult) {
          await cacheResult(firstName, lastName, domain, patternResult)
          return patternResult
        }
      }

      return null
    }

    let result: HunterEmailResult = {
      email: data.data.email,
      score: data.data.score,
      verified: data.data.verification?.status === 'valid',
      verificationStatus: data.data.verification?.status as HunterEmailResult['verificationStatus'],
      position: data.data.position,
      linkedin: data.data.linkedin_url,
      sources: data.data.sources?.length || 0,
      source: 'hunter',
    }

    // Verify the email if requested and not already verified
    if (verifyResult && !result.verified && result.score < 90) {
      const verification = await verifyEmail(data.data.email, apiKey)
      if (verification) {
        result.verified = verification.valid
        result.verificationStatus = verification.status as HunterEmailResult['verificationStatus']
        result.score = Math.max(result.score, verification.score)
      }
    }

    logger.info(
      { firstName, lastName, domain, email: result.email, score: result.score, verified: result.verified },
      'Email found via Hunter.io'
    )

    // Cache the result
    await cacheResult(firstName, lastName, domain, result)

    return result
  } catch (error) {
    logger.error({ error, firstName, lastName, company }, 'Hunter.io email lookup failed')
    return null
  }
}

// ============================================================================
// Bulk Domain Search
// ============================================================================

export async function searchDomain(
  domain: string,
  apiKey: string,
  options: {
    limit?: number
    offset?: number
    department?: string
    seniority?: string
  } = {}
): Promise<DomainSearchResult | null> {
  const { limit = 10, offset = 0, department, seniority } = options

  try {
    const params = new URLSearchParams({
      domain,
      api_key: apiKey,
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (department) params.set('department', department)
    if (seniority) params.set('seniority', seniority)

    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?${params.toString()}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    )

    if (response.status === 429) {
      logger.warn('Hunter.io rate limit reached during domain search')
      return null
    }

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Hunter.io domain search failed')
      return null
    }

    const data = await response.json() as HunterDomainSearchResponse

    return {
      domain: data.data.domain,
      organization: data.data.organization,
      emails: data.data.emails.map(e => ({
        email: e.value,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
        confidence: e.confidence,
      })),
      totalEmails: data.meta.results,
    }
  } catch (error) {
    logger.error({ error, domain }, 'Hunter.io domain search failed')
    return null
  }
}

// ============================================================================
// Batch Processing
// ============================================================================

export async function findEmailsBatch(
  prospects: Array<{
    id: string
    first_name: string
    last_name: string
    company: string
    website?: string | null
  }>,
  apiKey: string,
  options: {
    delayMs?: number
    onProgress?: (current: number, total: number, emailsFound: number) => void
  } = {}
): Promise<Map<string, HunterEmailResult>> {
  const { delayMs = 500, onProgress } = options
  const results = new Map<string, HunterEmailResult>()
  let emailsFound = 0

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i]

    const result = await findEmail(
      prospect.first_name,
      prospect.last_name,
      prospect.company,
      apiKey,
      { website: prospect.website }
    )

    if (result) {
      results.set(prospect.id, result)
      emailsFound++
    }

    if (onProgress) {
      onProgress(i + 1, prospects.length, emailsFound)
    }

    // Add delay between requests
    if (i < prospects.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}

// ============================================================================
// Export service object for easy importing
// ============================================================================

export const hunterService = {
  findEmail,
  verifyEmail,
  searchDomain,
  findEmailsBatch,
  getQuota,
  extractDomain,
  generateEmailPatterns,
  tryEmailPatterns,
}

export default hunterService
