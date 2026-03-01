import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../db/index.js'
import { validateBody } from '../middleware/validateInput.js'
import { hunterService } from '../services/hunter.service.js'
import { createLogger } from '../utils/logger.js'

const router = Router()
const logger = createLogger({ module: 'hunter-routes' })

// Validation schemas
const domainSearchSchema = z.object({
  domain: z.string().min(1),
  limit: z.number().min(1).max(100).optional(),
  department: z.string().optional(),
  seniority: z.string().optional(),
})

const emailLookupSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  company: z.string().min(1),
  website: z.string().optional(),
})

const bulkLookupSchema = z.object({
  prospects: z.array(z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    company: z.string(),
    website: z.string().optional(),
  })),
})

/**
 * GET /api/hunter/quota
 * Get current Hunter.io API quota
 */
router.get('/quota', async (_req, res, next) => {
  try {
    // Get Hunter API key from settings
    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const apiKey = hunterKeySetting?.value as string | undefined

    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          configured: false,
          quota: null,
        },
      })
    }

    const quota = await hunterService.getQuota(apiKey)

    res.json({
      success: true,
      data: {
        configured: true,
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          resetAt: quota.resetAt?.toISOString(),
          percentUsed: quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/hunter/domain-search
 * Search for all emails at a domain
 */
router.post('/domain-search', validateBody(domainSearchSchema), async (req, res, next) => {
  try {
    const { domain, limit, department, seniority } = req.body

    // Get Hunter API key from settings
    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const apiKey = hunterKeySetting?.value as string | undefined

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Hunter.io API key not configured. Add it in Settings.',
      })
    }

    const result = await hunterService.searchDomain(domain, apiKey, {
      limit,
      department,
      seniority,
    })

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'No results found for this domain',
      })
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/hunter/email-lookup
 * Look up a single email
 */
router.post('/email-lookup', validateBody(emailLookupSchema), async (req, res, next) => {
  try {
    const { first_name, last_name, company, website } = req.body

    // Get Hunter API key from settings
    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const apiKey = hunterKeySetting?.value as string | undefined

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Hunter.io API key not configured. Add it in Settings.',
      })
    }

    const result = await hunterService.findEmail(first_name, last_name, company, apiKey, {
      website,
      useCache: true,
      verifyResult: true,
      fallbackToPatterns: true,
    })

    if (!result) {
      return res.json({
        success: true,
        data: {
          found: false,
          email: null,
        },
      })
    }

    res.json({
      success: true,
      data: {
        found: true,
        email: result.email,
        score: result.score,
        verified: result.verified,
        source: result.source,
        linkedin: result.linkedin,
        position: result.position,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/hunter/bulk-lookup
 * Look up emails for multiple prospects
 */
router.post('/bulk-lookup', validateBody(bulkLookupSchema), async (req, res, next) => {
  try {
    const { prospects } = req.body

    // Get Hunter API key from settings
    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const apiKey = hunterKeySetting?.value as string | undefined

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Hunter.io API key not configured. Add it in Settings.',
      })
    }

    const results = await hunterService.findEmailsBatch(prospects, apiKey)

    // Convert Map to object for JSON response
    const resultsObj: Record<string, {
      email: string | null
      score: number
      verified: boolean
      source: string
    }> = {}

    results.forEach((result, id) => {
      resultsObj[id] = {
        email: result.email,
        score: result.score,
        verified: result.verified,
        source: result.source,
      }
    })

    res.json({
      success: true,
      data: {
        found: results.size,
        total: prospects.length,
        results: resultsObj,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/hunter/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', async (_req, res, next) => {
  try {
    // Get total cached entries
    const { count: totalCached } = await supabase
      .from('hunter_cache')
      .select('*', { count: 'exact', head: true })

    // Get entries with emails found
    const { count: withEmail } = await supabase
      .from('hunter_cache')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null)

    // Get expired entries
    const { count: expired } = await supabase
      .from('hunter_cache')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString())

    res.json({
      success: true,
      data: {
        totalCached: totalCached || 0,
        withEmail: withEmail || 0,
        withoutEmail: (totalCached || 0) - (withEmail || 0),
        expired: expired || 0,
        hitRate: totalCached ? Math.round(((withEmail || 0) / totalCached) * 100) : 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/hunter/cache
 * Clear the Hunter.io cache
 */
router.delete('/cache', async (_req, res, next) => {
  try {
    // First count how many entries exist
    const { count } = await supabase
      .from('hunter_cache')
      .select('*', { count: 'exact', head: true })

    // Then delete all entries
    await supabase
      .from('hunter_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    logger.info({ deletedCount: count }, 'Hunter cache cleared')

    res.json({
      success: true,
      data: {
        deleted: count || 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/hunter/enrich-prospects
 * Find and save emails for existing prospects (by IDs)
 */
const enrichProspectsSchema = z.object({
  prospect_ids: z.array(z.string().uuid()).min(1).max(100),
})

router.post('/enrich-prospects', validateBody(enrichProspectsSchema), async (req, res, next) => {
  try {
    const { prospect_ids } = req.body

    // Get Hunter API key from settings
    const { data: hunterKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'hunter_api_key')
      .single()

    const apiKey = hunterKeySetting?.value as string | undefined

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Hunter.io API key not configured. Add it in Settings.',
      })
    }

    // Get prospects
    const { data: prospects, error: fetchError } = await supabase
      .from('prospects')
      .select('id, first_name, last_name, company, email')
      .in('id', prospect_ids)

    if (fetchError) throw fetchError
    if (!prospects || prospects.length === 0) {
      return res.status(404).json({ success: false, error: 'No prospects found' })
    }

    // Filter to those needing emails (no email or explicitly requested)
    const needsEmail = prospects.filter(p =>
      p.first_name && p.last_name && p.company && !p.email
    )

    if (needsEmail.length === 0) {
      return res.json({
        success: true,
        data: {
          processed: 0,
          found: 0,
          updated: 0,
          message: 'All selected prospects already have verified emails or missing required fields',
        },
      })
    }

    // Look up emails
    const lookupData = needsEmail.map(p => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      company: p.company,
    }))

    const results = await hunterService.findEmailsBatch(lookupData, apiKey)

    // Update prospects with found emails
    let updated = 0
    for (const [id, result] of results) {
      if (result.email) {
        const { error: updateError } = await supabase
          .from('prospects')
          .update({
            email: result.email,
          })
          .eq('id', id)

        if (!updateError) updated++
      }
    }

    logger.info({ processed: needsEmail.length, found: results.size, updated }, 'Hunter email enrichment complete')

    res.json({
      success: true,
      data: {
        processed: needsEmail.length,
        found: results.size,
        updated,
      },
    })
  } catch (error) {
    next(error)
  }
})

export { router as hunterRoutes }
