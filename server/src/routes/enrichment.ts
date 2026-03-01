import { Router } from 'express'
import { supabase, queryMany } from '../db/index.js'
import { validateBody } from '../middleware/validateInput.js'
import { runEnrichmentSchema } from '../validators/enrichment.validator.js'
import { addEnrichmentJob, getJobStatus, QUEUE_NAMES } from '../jobs/queue.js'

const router = Router()

// GET /api/enrichment/stats
router.get('/stats', async (_req, res, next) => {
  try {
    // Get today's start of day in UTC
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Count prospects enriched today (ai_summary is set and updated today)
    const { count: enrichedToday } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .not('ai_summary', 'is', null)
      .not('ai_summary', 'ilike', 'Extracted from:%')
      .gte('updated_at', today.toISOString())

    // Get average relevance score for all enriched prospects
    const { data: scoreData } = await supabase
      .from('prospects')
      .select('relevance_score')
      .not('ai_summary', 'is', null)
      .not('ai_summary', 'ilike', 'Extracted from:%')
      .not('relevance_score', 'is', null)

    const avgScore =
      scoreData && scoreData.length > 0
        ? Math.round(
            scoreData.reduce((sum, p) => sum + (p.relevance_score || 0), 0) /
              scoreData.length
          )
        : null

    res.json({
      success: true,
      data: {
        enriched_today: enrichedToday || 0,
        avg_score: avgScore,
        total_enriched: scoreData?.length || 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/enrichment/queue
router.get('/queue', async (_req, res, next) => {
  try {
    // Find prospects that haven't been properly AI-enriched
    // (ai_summary is null OR is just a placeholder "Extracted from:" text)
    const prospects = await queryMany(
      supabase
        .from('prospects')
        .select('*')
        .or('ai_summary.is.null,ai_summary.ilike.Extracted from:%')
        .order('created_at', { ascending: false })
        .limit(100)
    )

    res.json({
      success: true,
      data: {
        count: prospects.length,
        prospects,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/enrichment/run
router.post('/run', validateBody(runEnrichmentSchema), async (req, res, next) => {
  try {
    const { prospect_ids, batch_size } = req.body

    // Add job to BullMQ queue - will be processed by enrichment worker
    const job = await addEnrichmentJob(prospect_ids, batch_size)

    res.json({
      success: true,
      data: {
        job_id: job.id,
        status: 'queued',
        prospect_count: prospect_ids.length,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/enrichment/jobs/:jobId/status
router.get('/jobs/:jobId/status', async (req, res, next) => {
  try {
    const job = await getJobStatus(QUEUE_NAMES.ENRICHMENT, req.params.jobId)

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    res.json({
      success: true,
      data: {
        status: job.state,
        progress: job.progress || 0,
        results: job.result,
        failedReason: job.failedReason,
      },
    })
  } catch (error) {
    next(error)
  }
})

export { router as enrichmentRoutes }
