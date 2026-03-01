import { Worker, Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '../../utils/logger.js'
import { getRedisConnection, QUEUE_NAMES, EnrichmentJobData, JobResult } from '../queue.js'
import { supabase, queryOne } from '../../db/index.js'
import {
  emitEnrichmentProgress,
  emitEnrichmentComplete,
  emitNotification,
} from '../../websocket/server.js'
import { findEmail } from '../../services/hunter.service.js'

const BRAVE_API_KEY = process.env.BRAVE_API_KEY

const logger = createLogger({ module: 'enrichment-worker' })

interface Prospect {
  id: string
  full_name: string
  first_name?: string
  last_name?: string
  title?: string
  company?: string
  email?: string
  email_verified?: boolean
  email_source?: string
  hunter_confidence?: number
  linkedin_url?: string
  [key: string]: unknown
}

interface EnrichmentResult {
  company_type?: string
  ccc_verticals?: string[]
  target_roles?: string[]
  relevance_score?: number
  ai_summary?: string
  linkedin_url?: string
  email?: string
  email_verified?: boolean
  email_source?: 'hunter' | 'pattern' | 'manual' | 'scraped'
  hunter_confidence?: number
  [key: string]: string | string[] | number | boolean | undefined
}

/**
 * Process enrichment jobs
 */
async function processEnrichmentJob(job: Job<EnrichmentJobData>): Promise<JobResult> {
  const { prospectIds, batchSize = 25 } = job.data
  const startTime = Date.now()

  logger.info({ jobId: job.id, prospectCount: prospectIds.length }, 'Processing enrichment job')

  try {
    // Get API keys from settings
    const { data: apiKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'anthropic_api_key')
      .single()

    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const apiKey = apiKeySetting?.value as string | undefined
    const hunterApiKey = hunterKeySetting?.value as string | undefined

    const results: Array<{
      prospect_id: string
      success: boolean
      changes?: Record<string, unknown>
      error?: string
    }> = []

    // Process in batches
    const idsToProcess = prospectIds.slice(0, batchSize)
    const total = idsToProcess.length

    for (let i = 0; i < total; i++) {
      const prospectId = idsToProcess[i]

      try {
        // Get prospect data
        const prospect = await queryOne<Prospect>(
          supabase.from('prospects').select('*').eq('id', prospectId).single()
        )

        if (!prospect) {
          results.push({
            prospect_id: prospectId,
            success: false,
            error: 'Prospect not found',
          })
          continue
        }

        // Update progress
        const progress = Math.round(((i + 1) / total) * 100)
        await job.updateProgress(progress)

        // Emit real-time progress via WebSocket
        emitEnrichmentProgress(
          job.id || '',
          i + 1,
          total,
          prospect.full_name
        )

        // Enrich the prospect - requires API key
        if (!apiKey) {
          results.push({
            prospect_id: prospectId,
            success: false,
            error: 'Anthropic API key not configured. Add it in Settings.',
          })
          continue
        }

        const enrichmentData = await enrichWithClaude(apiKey, prospect)

        // Hunter.io email lookup if prospect doesn't have a verified email
        if (hunterApiKey && prospect.first_name && prospect.last_name && prospect.company) {
          const needsEmail = !prospect.email ||
            (prospect.hunter_confidence !== undefined && prospect.hunter_confidence < 70) ||
            !prospect.email_verified

          if (needsEmail) {
            try {
              const emailResult = await findEmail(
                prospect.first_name,
                prospect.last_name,
                prospect.company as string,
                hunterApiKey,
                {
                  useCache: true,
                  verifyResult: true,
                  fallbackToPatterns: true,
                }
              )

              if (emailResult?.email) {
                enrichmentData.email = emailResult.email
                enrichmentData.email_verified = emailResult.verified
                // Map 'cache' source to 'hunter' since cached results are from Hunter
                enrichmentData.email_source = emailResult.source === 'cache' ? 'hunter' : emailResult.source
                enrichmentData.hunter_confidence = emailResult.score

                // Also capture LinkedIn if found
                if (emailResult.linkedin && !prospect.linkedin_url) {
                  enrichmentData.linkedin_url = emailResult.linkedin
                }
              }
            } catch (err) {
              logger.warn({ prospectId, error: err }, 'Hunter.io lookup failed during enrichment')
            }
          }
        }

        // Update prospect in database
        await supabase
          .from('prospects')
          .update(enrichmentData)
          .eq('id', prospectId)

        results.push({
          prospect_id: prospectId,
          success: true,
          changes: enrichmentData,
        })
      } catch (error) {
        results.push({
          prospect_id: prospectId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const duration = Date.now() - startTime
    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    logger.info(
      {
        jobId: job.id,
        duration,
        total,
        succeeded: successCount,
        failed: failedCount,
      },
      'Enrichment job completed'
    )

    // Emit completion event via WebSocket
    emitEnrichmentComplete(job.id || '', successCount, failedCount)

    // Send notification
    emitNotification(
      `Enrichment complete: ${successCount} prospects enriched`,
      failedCount > 0 ? 'warning' : 'success'
    )

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'enrichment_run',
      details: {
        job_id: job.id,
        count: successCount,
        total,
        failed: failedCount,
      },
    })

    return {
      success: true,
      data: {
        enriched: successCount,
        failed: failedCount,
        results,
      },
      metadata: {
        duration,
        usedApi: !!apiKey,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ jobId: job.id, error: errorMessage }, 'Enrichment job failed')

    emitNotification(
      `Enrichment failed: ${errorMessage}`,
      'error'
    )

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Search for information about a prospect using Brave Search
 */
async function researchProspect(prospect: Prospect): Promise<string> {
  if (!BRAVE_API_KEY) {
    return 'No web research available (BRAVE_API_KEY not configured)'
  }

  const searchResults: string[] = []

  try {
    // Search for the person + company
    const personQuery = `"${prospect.full_name}" ${prospect.company || ''} ${prospect.title || ''} data center`
    const personResults = await braveSearch(personQuery)
    if (personResults.length > 0) {
      searchResults.push('=== Person Search Results ===')
      personResults.slice(0, 3).forEach(r => {
        searchResults.push(`- ${r.title}: ${r.description}`)
        if (r.url) searchResults.push(`  URL: ${r.url}`)
      })
    }

    // Search for the company + data center involvement
    if (prospect.company) {
      const companyQuery = `"${prospect.company}" data center infrastructure`
      const companyResults = await braveSearch(companyQuery)
      if (companyResults.length > 0) {
        searchResults.push('\n=== Company Search Results ===')
        companyResults.slice(0, 3).forEach(r => {
          searchResults.push(`- ${r.title}: ${r.description}`)
        })
      }
    }

    // Search for LinkedIn profile
    const linkedInQuery = `site:linkedin.com "${prospect.full_name}" ${prospect.company || ''}`
    const linkedInResults = await braveSearch(linkedInQuery)
    if (linkedInResults.length > 0) {
      searchResults.push('\n=== LinkedIn Results ===')
      linkedInResults.slice(0, 2).forEach(r => {
        searchResults.push(`- ${r.title}: ${r.description}`)
        if (r.url) searchResults.push(`  URL: ${r.url}`)
      })
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to research prospect')
    searchResults.push('Web research failed - using basic information only')
  }

  return searchResults.join('\n') || 'No search results found'
}

/**
 * Perform a Brave Search
 */
async function braveSearch(query: string): Promise<Array<{ title: string; description: string; url?: string }>> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY!,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.status}`)
  }

  const data = await response.json() as {
    web?: {
      results?: Array<{
        title: string
        description: string
        url: string
      }>
    }
  }

  return (data.web?.results || []).map(r => ({
    title: r.title,
    description: r.description,
    url: r.url,
  }))
}

/**
 * Enrich with Claude API - now with web research
 */
async function enrichWithClaude(
  apiKey: string,
  prospect: Prospect
): Promise<EnrichmentResult> {
  const anthropic = new Anthropic({ apiKey })

  // First, research the prospect using web search
  const webResearch = await researchProspect(prospect)

  const systemPrompt = `You are an AI assistant helping to categorize and score prospects for the CCC Data Center Dealmakers Summit. You have access to web search results about each prospect.

CCC Verticals (one or more):
- Development: Real estate developers, land acquisition, entitlements
- Investment: Equity, debt, capital markets, family offices, institutional investors
- Brokerage: Commercial real estate brokers, advisors, tenant reps
- Management: Asset management, property management, facilities
- Construction: General contractors, MEP/specialty trades, engineering, design-build

Target Roles:
- Attendee: General conference attendee
- Sponsor: Company that might sponsor the event (typically executives from major data center companies)
- Speaker: Industry expert who could speak at the summit (VPs, C-level, recognized thought leaders)

Company Types:
- Hyperscaler: Cloud providers (AWS, Azure, Google Cloud, Meta, Oracle)
- Developer/Operator: Companies that build/operate data centers
- Investor: Private equity, REITs, family offices investing in data centers
- Broker: Commercial real estate advisory firms
- Contractor: Construction companies
- Engineering: Engineering and design firms
- Consulting: Strategy and technology consultants
- Legal: Law firms specializing in real estate/data centers
- Finance: Banks, lenders, financial advisors
- Other: Doesn't fit above categories

Relevance Score (1-100):
- 90-100: Perfect fit, high-value target (C-level at major DC company, proven track record, active speaker)
- 75-89: Strong fit, priority prospect (Director+ at relevant company, data center experience)
- 60-74: Good fit, solid prospect (Manager level at DC company, adjacent industry)
- 40-59: Moderate fit, worth pursuing (Tangential industry involvement)
- 20-39: Weak fit, lower priority
- 1-19: Poor fit, likely not relevant

IMPORTANT: Use the web research results to provide SPECIFIC, ACTIONABLE insights. Include:
- Specific projects or deals they've worked on
- Their actual experience in data centers (if any)
- Recent news or announcements
- Why they would specifically benefit from attending THIS summit
- Potential conversation starters or connection points

Respond with valid JSON only.`

  const userPrompt = `Analyze this prospect using the web research provided:

=== PROSPECT INFO ===
Name: ${prospect.full_name}
Title: ${prospect.title || 'Unknown'}
Company: ${prospect.company || 'Unknown'}

=== WEB RESEARCH ===
${webResearch}

Based on this research, provide a detailed categorization. Your ai_summary should include SPECIFIC insights from the research - not generic statements.

Respond with JSON in this exact format:
{
  "company_type": "one of: Hyperscaler, Developer/Operator, Investor, Broker, Contractor, Engineering, Consulting, Legal, Finance, Other",
  "ccc_verticals": ["array of applicable verticals"],
  "target_roles": ["array of: Attendee, Sponsor, Speaker"],
  "relevance_score": number_1_to_100,
  "ai_summary": "3-4 sentences with SPECIFIC insights from the research. Include: their actual DC experience, specific projects, why they'd value this summit, and a potential conversation starter.",
  "linkedin_url": "LinkedIn URL if found in research, or null",
  "key_facts": ["2-3 bullet points of specific, actionable facts about this person"]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // Extract JSON from response - handle markdown code blocks or extra text
  let jsonText = content.text.trim()

  // Try to extract JSON from markdown code block
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Try to find JSON object in the text
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonText = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonText)

    // Build enhanced summary with key facts
    let enhancedSummary = parsed.ai_summary || 'No summary generated'
    if (parsed.key_facts && parsed.key_facts.length > 0) {
      enhancedSummary += '\n\nKey Facts:\n' + parsed.key_facts.map((f: string) => `• ${f}`).join('\n')
    }

    return {
      company_type: parsed.company_type || 'Other',
      ccc_verticals: parsed.ccc_verticals || [],
      target_roles: parsed.target_roles || ['Attendee'],
      relevance_score: Math.min(100, Math.max(1, parsed.relevance_score || 50)),
      ai_summary: enhancedSummary,
      linkedin_url: parsed.linkedin_url || undefined,
    }
  } catch (parseError) {
    logger.error({
      error: parseError,
      rawResponse: content.text.substring(0, 500)
    }, 'Failed to parse AI response')
    throw new Error('Failed to parse AI response')
  }
}

/**
 * Create and start the enrichment worker
 */
export function createEnrichmentWorker(): Worker<EnrichmentJobData, JobResult> {
  const worker = new Worker<EnrichmentJobData, JobResult>(
    QUEUE_NAMES.ENRICHMENT,
    processEnrichmentJob,
    {
      connection: getRedisConnection(),
      concurrency: 1, // Process one enrichment job at a time
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  )

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, success: result.success }, 'Enrichment job completed')
  })

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Enrichment job failed')
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Enrichment worker error')
  })

  logger.info('Enrichment worker started')
  return worker
}

export default createEnrichmentWorker
