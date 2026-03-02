import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { addResearchJob, getJobStatus, QUEUE_NAMES } from '../jobs/queue.js'
import { supabase } from '../db/index.js'
import { validateBody } from '../middleware/validateInput.js'
import { z } from 'zod'

const router = Router()

const aiResearchSchema = z.object({
  query: z.string().min(10, 'Please provide more detail about what you\'re looking for').max(2000),
  maxUrls: z.number().min(5).max(50).optional().default(10),
})

// POST /api/research/ai - Start AI-powered research
router.post('/ai', validateBody(aiResearchSchema), async (req, res, next) => {
  try {
    const { query, maxUrls } = req.body
    const jobId = uuidv4()

    // Check if we have an Anthropic API key
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'anthropic_api_key')
      .single()

    if (!settings?.value) {
      return res.status(400).json({
        success: false,
        error: 'Anthropic API key not configured. Please add it in Settings.',
      })
    }

    // Require Redis for research jobs
    if (!process.env.REDIS_URL) {
      return res.status(503).json({
        success: false,
        error: 'Redis is required for AI research. Please configure REDIS_URL.',
      })
    }

    // Check for Brave Search API key
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'Brave Search API key not configured. Please add BRAVE_SEARCH_API_KEY to your environment.',
      })
    }

    // Add job to queue
    await addResearchJob(jobId, {
      query,
      apiKey: settings.value,
      maxUrls: maxUrls || 10,
    })

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'scrape_started',
      details: {
        type: 'ai_research',
        job_id: jobId,
        query: query.substring(0, 100),
      },
    })

    res.json({
      success: true,
      data: { job_id: jobId },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/research/ai/:jobId/status
router.get('/ai/:jobId/status', async (req, res, next) => {
  try {
    const { jobId } = req.params

    if (process.env.REDIS_URL) {
      const status = await getJobStatus(QUEUE_NAMES.RESEARCH, jobId)
      if (status) {
        return res.json({
          success: true,
          data: {
            status: status.state,
            progress: status.progress,
            progressData: status.progressData,  // Rich progress with stage, message, etc.
            result: status.result,
          },
        })
      }
    }

    // Check database for simulation results
    const { data: job } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' })
    }

    res.json({
      success: true,
      data: {
        status: job.status,
        progress: job.progress,
        results_count: job.results_count,
      },
    })
  } catch (error) {
    next(error)
  }
})

export { router as researchRoutes }
