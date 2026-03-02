import { Worker, Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { getRedisConnection, QUEUE_NAMES, ResearchJobData, JobResult } from '../queue.js'
import { supabase } from '../../db/index.js'
import { getIO } from '../../websocket/server.js'
import { createLogger } from '../../utils/logger.js'
import { deduplicationService } from '../../services/deduplication.service.js'
import { findEmail } from '../../services/hunter.service.js'

const logger = createLogger({ module: 'research-worker' })

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY

interface BraveSearchResult {
  title: string
  url: string
  description: string
}

interface Prospect {
  first_name: string
  last_name: string
  full_name: string
  title?: string
  company?: string
  email?: string
  email_verified?: boolean
  email_source?: 'hunter' | 'pattern' | 'manual' | 'scraped'
  hunter_confidence?: number
  linkedin_url?: string
  location_city?: string
  location_state?: string
  location_country?: string
  status: string
  ccc_verticals: string[]
  target_roles: string[]
  relevance_score: number
  ai_summary?: string
}

/**
 * Emit progress to WebSocket clients AND store in job data for polling
 */
async function emitProgress(
  jobId: string,
  data: Record<string, unknown>,
  job?: Job<ResearchJobData>
) {
  // Emit via WebSocket for real-time updates
  const io = getIO()
  if (io) {
    io.emit(`research:${jobId}`, data)
  }

  // Also store in job data so polling can access rich progress
  if (job) {
    try {
      await job.updateData({
        ...job.data,
        lastProgress: data,
      })
    } catch (err) {
      // Don't fail the job if progress update fails
      logger.debug({ jobId, error: err }, 'Failed to update job progress data')
    }
  }
}

/**
 * Search using Brave Search API
 */
async function braveSearch(query: string, count = 10): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    logger.warn('Brave Search API key not configured')
    return []
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      }
    )

    if (!response.ok) {
      logger.error({ status: response.status }, 'Brave Search API error')
      return []
    }

    const data = await response.json()
    return (data.web?.results || []).map((r: { title: string; url: string; description: string }) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }))
  } catch (error) {
    logger.error({ error }, 'Brave Search failed')
    return []
  }
}

/**
 * Fetch and extract text from a URL
 */
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) return null

    const html = await response.text()

    // Strip scripts, styles, and extract text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000) // Limit to ~15k chars for Claude context

    return textContent
  } catch (error) {
    logger.debug({ url, error }, 'Failed to fetch page')
    return null
  }
}

/**
 * Generate search queries from user criteria
 */
function generateSearchQueries(query: string, maxQueries = 5): string[] {
  const queries: string[] = []

  // Parse the structured query
  const hasHyperscaler = query.toLowerCase().includes('hyperscaler')
  const hasDeveloper = query.toLowerCase().includes('developer')
  const hasDataCenter = query.toLowerCase().includes('data center')
  const hasVP = query.toLowerCase().includes('vp')
  const hasDirector = query.toLowerCase().includes('director')
  const hasConstruction = query.toLowerCase().includes('construction')
  const hasContractor = query.toLowerCase().includes('contractor')

  // Extract locations
  const locationMatches = query.match(/located in ([^.]+)/i)
  const locations = locationMatches ? locationMatches[1].split(',').map(l => l.trim()) : []

  // Extract companies
  const companyMatches = query.match(/companies like ([^.]+)/i)
  const companies = companyMatches ? companyMatches[1].split(',').map(c => c.trim()) : []

  // Generate targeted search queries
  if (hasDataCenter || hasHyperscaler || hasDeveloper) {
    queries.push('data center conference speakers 2024 2025')
    queries.push('data center industry executives leadership')
    queries.push('data center development executives team')
    queries.push('colocation data center leadership team')
  }

  if (hasConstruction || hasContractor) {
    queries.push('data center construction executives leadership')
    queries.push('data center general contractor leadership')
    queries.push('mission critical construction executives')
  }

  if (hasVP || hasDirector) {
    const titleLevel = hasVP ? 'VP Vice President' : 'Director'
    queries.push(`${titleLevel} data center operations`)
    queries.push(`${titleLevel} cloud infrastructure`)
    queries.push(`${titleLevel} data center development`)
  }

  // Location-specific searches - allow more locations
  for (const loc of locations.slice(0, 4)) {
    queries.push(`data center companies ${loc} leadership team`)
    queries.push(`data center executives ${loc}`)
  }

  // Company-specific searches - allow more companies
  for (const company of companies.slice(0, 5)) {
    queries.push(`${company} leadership team executives`)
    queries.push(`${company} data center team`)
  }

  // Industry searches
  if (hasHyperscaler) {
    queries.push('AWS Google Microsoft Azure data center executives')
    queries.push('Meta Apple data center leadership')
  }
  if (hasDeveloper) {
    queries.push('Equinix Digital Realty CyrusOne leadership')
    queries.push('QTS Vantage CoreSite executives leadership')
  }

  // Add general fallback queries
  if (queries.length === 0) {
    queries.push('data center industry executives')
    queries.push('cloud infrastructure leadership team')
    queries.push('data center development executives')
  }

  // Add additional generic queries if we need more
  const additionalQueries = [
    'data center real estate executives',
    'hyperscale data center leadership',
    'enterprise data center management',
    'data center operations executives',
    'critical infrastructure executives',
  ]

  while (queries.length < maxQueries && additionalQueries.length > 0) {
    queries.push(additionalQueries.shift()!)
  }

  // Dedupe and limit to requested number
  return [...new Set(queries)].slice(0, maxQueries)
}

/**
 * Process a research job with REAL web search and scraping
 */
async function processResearchJob(job: Job<ResearchJobData>): Promise<JobResult> {
  const { jobId, query, apiKey, maxUrls = 10 } = job.data

  logger.info({ jobId, queryLength: query.length, maxUrls }, 'Processing research job with real data')

  try {
    // Stage 1: Understanding & generating searches
    await emitProgress(jobId, {
      stage: 'understanding',
      message: 'Analyzing your research criteria...',
      progress: 5,
    }, job)

    // Calculate how many queries and results per query we need based on maxUrls
    // More sources = more queries with more results each
    const numQueries = Math.min(10, Math.ceil(maxUrls / 10)) // Up to 10 queries
    const resultsPerQuery = Math.min(20, Math.ceil(maxUrls / numQueries)) // Up to 20 per query

    const searchQueries = generateSearchQueries(query, numQueries)
    logger.info({ jobId, searchQueries, resultsPerQuery }, 'Generated search queries')

    await job.updateProgress(10)

    // Stage 2: Web Search
    await emitProgress(jobId, {
      stage: 'searching',
      message: `Searching the web (${searchQueries.length} queries)...`,
      progress: 15,
    }, job)

    const allResults: BraveSearchResult[] = []
    for (let i = 0; i < searchQueries.length; i++) {
      const results = await braveSearch(searchQueries[i], resultsPerQuery)
      allResults.push(...results)

      await emitProgress(jobId, {
        stage: 'searching',
        message: `Searched ${i + 1}/${searchQueries.length} queries (${allResults.length} sources found)...`,
        urlsFound: allResults.length,
        progress: 15 + (i / searchQueries.length) * 15,
      }, job)

      // Rate limit: 1 request per second for Brave API
      await new Promise(r => setTimeout(r, 1000))
    }

    // Dedupe URLs
    const uniqueUrls = [...new Set(allResults.map(r => r.url))].slice(0, maxUrls)
    logger.info({ jobId, urlCount: uniqueUrls.length, maxUrls }, 'Found unique URLs')

    await job.updateProgress(30)

    // Stage 3: Scraping
    await emitProgress(jobId, {
      stage: 'scraping',
      message: `Extracting data from ${uniqueUrls.length} sources...`,
      urlsFound: uniqueUrls.length,
      progress: 35,
    }, job)

    const pageContents: { url: string; content: string }[] = []
    for (let i = 0; i < uniqueUrls.length; i++) {
      const content = await fetchPageContent(uniqueUrls[i])
      if (content && content.length > 200) {
        pageContents.push({ url: uniqueUrls[i], content })
      }

      await emitProgress(jobId, {
        stage: 'scraping',
        message: `Scraped ${i + 1}/${uniqueUrls.length} pages...`,
        urlsFound: uniqueUrls.length,
        progress: 35 + (i / uniqueUrls.length) * 25,
      }, job)
    }

    logger.info({ jobId, pagesScraped: pageContents.length }, 'Scraped pages')
    await job.updateProgress(60)

    // Stage 4: Extract prospects using Claude
    await emitProgress(jobId, {
      stage: 'extracting',
      message: 'AI analyzing scraped content for prospects...',
      urlsFound: uniqueUrls.length,
      progress: 65,
    }, job)

    const anthropic = new Anthropic({ apiKey })
    const allProspects: Prospect[] = []

    // Process pages in batches
    for (let i = 0; i < pageContents.length; i++) {
      const { url, content } = pageContents[i]

      try {
        const extraction = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `Extract real people/executives from this webpage content. Only extract REAL people with names and job titles that are clearly mentioned.

Original search criteria: "${query}"
Source URL: ${url}

Page content:
${content.slice(0, 8000)}

Extract any people that match the criteria. Return a JSON array (or empty array if none found):
[
  {
    "first_name": "...",
    "last_name": "...",
    "title": "...",
    "company": "...",
    "location_city": "..." (if mentioned),
    "location_state": "..." (if mentioned),
    "relevance_score": 70-95 (based on match to criteria)
  }
]

IMPORTANT: Only extract REAL people actually mentioned in the content. Do not make up names. Return [] if no relevant people found.`,
            },
          ],
        })

        const responseContent = extraction.content[0]
        if (responseContent.type === 'text') {
          const jsonMatch = responseContent.text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0])
            for (const p of extracted) {
              if (p.first_name && p.last_name) {
                allProspects.push({
                  first_name: p.first_name,
                  last_name: p.last_name,
                  full_name: `${p.first_name} ${p.last_name}`,
                  title: p.title,
                  company: p.company,
                  location_city: p.location_city,
                  location_state: p.location_state,
                  location_country: 'US',
                  status: 'New',
                  ccc_verticals: ['Data Centers'],
                  target_roles: ['Attendee'],
                  relevance_score: p.relevance_score || 75,
                  ai_summary: `Extracted from: ${url}`,
                })
              }
            }
          }
        }
      } catch (err) {
        logger.warn({ url, error: err }, 'Failed to extract from page')
      }

      await emitProgress(jobId, {
        stage: 'extracting',
        message: `Analyzed ${i + 1}/${pageContents.length} pages, found ${allProspects.length} prospects...`,
        urlsFound: uniqueUrls.length,
        prospectsFound: allProspects.length,
        progress: 65 + (i / pageContents.length) * 25,
      }, job)
    }

    await job.updateProgress(90)

    // Dedupe prospects by name within this batch
    const uniqueProspects = allProspects.reduce((acc, p) => {
      const key = p.full_name.toLowerCase()
      if (!acc.has(key)) {
        acc.set(key, p)
      }
      return acc
    }, new Map<string, Prospect>())

    const batchProspects = Array.from(uniqueProspects.values())
    logger.info({ jobId, prospectCount: batchProspects.length }, 'Extracted unique prospects from batch')

    // Stage 4.5: Hunter.io Email Lookup (with caching, verification, and pattern fallback)
    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const hunterApiKey = hunterKeySetting?.value as string | undefined

    if (hunterApiKey && batchProspects.length > 0) {
      await emitProgress(jobId, {
        stage: 'enriching',
        message: `Finding & verifying email addresses for ${batchProspects.length} prospects...`,
        urlsFound: uniqueUrls.length,
        prospectsFound: batchProspects.length,
        progress: 90,
      }, job)

      let emailsFound = 0
      let verifiedCount = 0
      let cacheHits = 0

      for (let i = 0; i < batchProspects.length; i++) {
        const prospect = batchProspects[i]

        // Only look up if we have first name, last name, and company
        if (prospect.first_name && prospect.last_name && prospect.company) {
          try {
            const result = await findEmail(
              prospect.first_name,
              prospect.last_name,
              prospect.company,
              hunterApiKey,
              {
                useCache: true,           // Use cached results
                verifyResult: true,       // Verify emails with low confidence
                fallbackToPatterns: true, // Try email patterns if Hunter fails
              }
            )

            if (result?.email) {
              prospect.email = result.email
              prospect.email_verified = result.verified
              // Map 'cache' source to 'hunter' since cached results are from Hunter
              prospect.email_source = result.source === 'cache' ? 'hunter' : result.source
              prospect.hunter_confidence = result.score

              // Add LinkedIn if found and not already set
              if (result.linkedin && !prospect.linkedin_url) {
                prospect.linkedin_url = result.linkedin
              }

              emailsFound++
              if (result.verified) verifiedCount++
              if (result.source === 'cache') cacheHits++
            }
          } catch (err) {
            logger.warn({ name: prospect.full_name, error: err }, 'Hunter.io lookup failed')
          }

          // Delay between Hunter.io requests (skip if cache hit)
          if (i < batchProspects.length - 1) {
            await new Promise(r => setTimeout(r, 400))
          }
        }

        // Update progress periodically
        if (i % 5 === 0 || i === batchProspects.length - 1) {
          await emitProgress(jobId, {
            stage: 'enriching',
            message: `Finding emails: ${i + 1}/${batchProspects.length} (${emailsFound} found, ${verifiedCount} verified)...`,
            urlsFound: uniqueUrls.length,
            prospectsFound: batchProspects.length,
            emailsFound,
            verifiedCount,
            progress: 90 + (i / batchProspects.length) * 2,
          }, job)
        }
      }

      logger.info({
        jobId,
        emailsFound,
        verifiedCount,
        cacheHits,
        total: batchProspects.length,
      }, 'Hunter.io email lookup complete')
    }

    // Stage 5: Dedupe against existing database
    await emitProgress(jobId, {
      stage: 'extracting',
      message: 'Checking for duplicates...',
      urlsFound: uniqueUrls.length,
      prospectsFound: batchProspects.length,
      progress: 92,
    }, job)

    // Check each prospect against existing database
    const newProspects: Prospect[] = []
    let duplicateCount = 0

    for (const prospect of batchProspects) {
      const dedupeResult = await deduplicationService.checkDuplicate({
        full_name: prospect.full_name,
        email: prospect.email,
        company: prospect.company,
        linkedin_url: prospect.linkedin_url,
      })

      if (dedupeResult.isNew) {
        newProspects.push(prospect)
      } else {
        duplicateCount++
        logger.debug({
          name: prospect.full_name,
          matchType: dedupeResult.bestMatch?.matchType,
          score: dedupeResult.bestMatch?.score,
        }, 'Skipping duplicate prospect')
      }
    }

    logger.info({ jobId, newCount: newProspects.length, duplicates: duplicateCount }, 'Deduplication complete')

    // Stage 6: Save to database
    await emitProgress(jobId, {
      stage: 'extracting',
      message: `Saving ${newProspects.length} new prospects (${duplicateCount} duplicates skipped)...`,
      urlsFound: uniqueUrls.length,
      prospectsFound: newProspects.length,
      progress: 95,
    }, job)

    let insertedCount = 0
    if (newProspects.length > 0) {
      const { data: inserted, error } = await supabase
        .from('prospects')
        .insert(newProspects)
        .select()

      if (error) {
        logger.error({ jobId, error }, 'Failed to insert prospects')
      } else {
        insertedCount = inserted?.length || 0
        // Invalidate dedup cache since we added new records
        deduplicationService.invalidateCache()
      }
    }

    await job.updateProgress(100)

    // Complete
    const completeMessage = insertedCount > 0
      ? `Found ${insertedCount} new prospects from ${pageContents.length} sources!${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`
      : duplicateCount > 0
        ? `All ${duplicateCount} prospects found were already in your database.`
        : 'No matching prospects found. Try broader criteria.'

    await emitProgress(jobId, {
      stage: 'complete',
      message: completeMessage,
      urlsFound: uniqueUrls.length,
      prospectsFound: insertedCount,
      duplicatesSkipped: duplicateCount,
      progress: 100,
    }, job)

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'scrape_completed',
      details: {
        type: 'ai_research',
        job_id: jobId,
        prospects_found: insertedCount,
        pages_scraped: pageContents.length,
        query: query.substring(0, 100),
      },
    })

    logger.info({ jobId, prospectsFound: insertedCount, pagesScraped: pageContents.length }, 'Research job completed')

    return {
      success: true,
      data: { prospectsFound: insertedCount, pagesScraped: pageContents.length },
    }
  } catch (error) {
    logger.error({ jobId, error }, 'Research job failed')

    await emitProgress(jobId, {
      stage: 'complete',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: 100,
    }, job)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create and start the research worker
 */
export function createResearchWorker(): Worker<ResearchJobData, JobResult> {
  const worker = new Worker<ResearchJobData, JobResult>(
    QUEUE_NAMES.RESEARCH,
    processResearchJob,
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  )

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Research job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Research job failed')
  })

  logger.info('Research worker started')
  return worker
}
