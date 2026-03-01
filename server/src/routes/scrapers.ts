import { Router } from 'express'
import { supabase, queryMany, queryOne, mutate } from '../db/index.js'
import { v4 as uuidv4 } from 'uuid'
import { addScraperJob, getJobStatus, QUEUE_NAMES } from '../jobs/queue.js'
import { validateBody, validateParams } from '../middleware/validateInput.js'
import {
  createScraperSchema,
  updateScraperConfigSchema,
  toggleScraperSchema,
  jobIdParamSchema,
} from '../validators/scraper.validator.js'

const router = Router()

// GET /api/scrapers
router.get('/', async (_req, res, next) => {
  try {
    const scrapers = await queryMany(
      supabase
        .from('scrapers')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })
    )

    res.json({ success: true, data: scrapers })
  } catch (error) {
    next(error)
  }
})

// POST /api/scrapers - Create new scraper
router.post('/', validateBody(createScraperSchema), async (req, res, next) => {
  try {
    const { name, type, description, config, is_active } = req.body

    // Direct Supabase insert with error handling
    const { data: scraper, error } = await supabase
      .from('scrapers')
      .insert({
        name,
        type,
        description,
        config: config || {},
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase scraper insert error:', error)
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
        details: error.details || error.hint || null
      })
    }

    if (!scraper) {
      return res.status(500).json({ success: false, error: 'Failed to create scraper - no data returned' })
    }

    // Log activity (non-blocking)
    void supabase.from('activity_log').insert({
      action: 'scrape_started',
      details: { scraper_id: scraper.id, scraper_name: name, event: 'scraper_created' },
    })

    res.status(201).json({ success: true, data: scraper })
  } catch (error) {
    console.error('Create scraper error:', error)
    next(error)
  }
})

// GET /api/scrapers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const scraper = await queryOne(
      supabase.from('scrapers').select('*').eq('id', req.params.id).single()
    )

    if (!scraper) {
      return res.status(404).json({ success: false, error: 'Scraper not found' })
    }

    res.json({ success: true, data: scraper })
  } catch (error) {
    next(error)
  }
})

// PUT /api/scrapers/:id/config
router.put('/:id/config', validateBody(updateScraperConfigSchema), async (req, res, next) => {
  try {
    const scraper = await mutate(
      supabase
        .from('scrapers')
        .update({ config: req.body })
        .eq('id', req.params.id)
        .select()
        .single()
    )

    res.json({ success: true, data: scraper })
  } catch (error) {
    next(error)
  }
})

// POST /api/scrapers/:id/toggle
router.post('/:id/toggle', validateBody(toggleScraperSchema), async (req, res, next) => {
  try {
    const { is_active } = req.body

    const scraper = await mutate(
      supabase
        .from('scrapers')
        .update({ is_active })
        .eq('id', req.params.id)
        .select()
        .single()
    )

    res.json({ success: true, data: scraper })
  } catch (error) {
    next(error)
  }
})

// POST /api/scrapers/:id/run
router.post('/:id/run', async (req, res, next) => {
  try {
    const scraperId = req.params.id

    // Get scraper config
    const scraper = await queryOne<{ name: string; config: Record<string, unknown> }>(
      supabase.from('scrapers').select('name, config').eq('id', scraperId).single()
    )

    if (!scraper) {
      return res.status(404).json({ success: false, error: 'Scraper not found' })
    }

    // Require Redis for scraping
    if (!process.env.REDIS_URL) {
      return res.status(503).json({
        success: false,
        error: 'Redis is required for scraping. Please configure REDIS_URL.',
      })
    }

    // Add job to BullMQ queue for background processing
    const job = await addScraperJob(scraperId, {
      urls: (scraper.config?.urls as string[]) || [],
      keywords: (scraper.config?.keywords as string[]) || [],
      max_pages: (scraper.config?.pagination as { max_pages?: number })?.max_pages,
      selectors: scraper.config?.selectors as Record<string, string>,
    })
    const jobId = job.id || uuidv4()

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'scrape_started',
      details: {
        scraper_id: scraperId,
        scraper_name: scraper.name,
        job_id: jobId,
      },
    })

    res.json({ success: true, data: { job_id: jobId } })
  } catch (error) {
    next(error)
  }
})

interface ScrapeJob {
  id: string
  status: string
  progress: number
  results_count: number
  results: unknown[]
  scraper_id: string
  error?: string
}

// GET /api/scrapers/jobs/:jobId/status
router.get('/jobs/:jobId/status', validateParams(jobIdParamSchema), async (req, res, next) => {
  try {
    const jobId = req.params.jobId

    // First try to get status from BullMQ if Redis is available
    if (process.env.REDIS_URL) {
      const queueStatus = await getJobStatus(QUEUE_NAMES.SCRAPER, jobId)
      if (queueStatus) {
        // Map BullMQ state to our status format
        const statusMap: Record<string, string> = {
          waiting: 'pending',
          active: 'running',
          completed: 'completed',
          failed: 'failed',
          delayed: 'pending',
        }

        return res.json({
          success: true,
          data: {
            status: statusMap[queueStatus.state] || queueStatus.state,
            progress: queueStatus.progress,
            results_count: (queueStatus.result as { saved?: number })?.saved || 0,
            error: queueStatus.failedReason,
          },
        })
      }
    }

    // Fall back to database for status
    const job = await queryOne<ScrapeJob>(
      supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .single()
    )

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    res.json({
      success: true,
      data: {
        status: job.status,
        progress: job.progress,
        results_count: job.results_count,
        error: job.error,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/scrapers/jobs/:jobId/import
router.post('/jobs/:jobId/import', validateParams(jobIdParamSchema), async (req, res, next) => {
  try {
    const job = await queryOne<ScrapeJob>(
      supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', req.params.jobId)
        .single()
    )

    if (!job || job.status !== 'completed') {
      return res
        .status(400)
        .json({ success: false, error: 'Job not ready for import' })
    }

    const results = job.results as Array<{
      full_name: string
      title?: string
      company?: string
      source_url?: string
    }>

    // Insert prospects
    const prospects = results.map((r) => ({
      full_name: r.full_name,
      title: r.title,
      company: r.company,
      status: 'New',
      ccc_verticals: [],
      target_roles: [],
      relevance_score: 0,
    }))

    const { data: inserted } = await supabase
      .from('prospects')
      .insert(prospects)
      .select()

    // Create source records
    if (inserted) {
      const scraper = await queryOne<{ type: string; name: string }>(
        supabase.from('scrapers').select('type, name').eq('id', job.scraper_id).single()
      )

      const sources = inserted.map((p, i) => ({
        prospect_id: p.id,
        source_type: scraper?.type || 'manual',
        source_name: scraper?.name,
        source_url: results[i]?.source_url,
        raw_data: results[i],
      }))

      await supabase.from('prospect_sources').insert(sources)
    }

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'prospect_added',
      details: { count: inserted?.length || 0, source: 'scraper_import' },
    })

    res.json({ success: true, data: { imported: inserted?.length || 0 } })
  } catch (error) {
    next(error)
  }
})

export { router as scrapersRoutes }
