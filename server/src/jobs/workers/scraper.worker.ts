import { Worker, Job } from 'bullmq'
import { createLogger } from '../../utils/logger.js'
import { getRedisConnection, QUEUE_NAMES, ScraperJobData, JobResult } from '../queue.js'
import { getScraperById } from '../../scrapers/registry.js'
import { supabase } from '../../db/index.js'
import {
  emitScraperProgress,
  emitScraperComplete,
  emitNotification,
} from '../../websocket/server.js'

const logger = createLogger({ module: 'scraper-worker' })

/**
 * Process scraper jobs
 */
async function processScraperJob(job: Job<ScraperJobData>): Promise<JobResult> {
  const { scraperId, config } = job.data
  const startTime = Date.now()

  logger.info({ jobId: job.id, scraperId }, 'Processing scraper job')

  try {
    // Update job progress
    await job.updateProgress(5)

    // Get scraper instance
    const scraper = getScraperById(scraperId)
    if (!scraper) {
      throw new Error(`Scraper not found: ${scraperId}`)
    }

    await job.updateProgress(10)

    // Run the scraper
    const result = await scraper.run(config, async (progress) => {
      // Map scraper progress to job progress (10-90 range)
      const jobProgress = 10 + Math.floor((progress.current / progress.total) * 80)
      await job.updateProgress(jobProgress)

      // Emit real-time WebSocket progress
      emitScraperProgress(
        job.id || '',
        scraperId,
        jobProgress,
        progress.current,
        progress.total,
        progress.message || `Processing item ${progress.current} of ${progress.total}`
      )
    })

    if (!result.success) {
      throw new Error(result.errors.join(', '))
    }

    await job.updateProgress(90)

    // Save prospects to database
    let savedCount = 0
    const errors: string[] = []

    for (const prospect of result.prospects) {
      try {
        const { error } = await supabase.from('prospects').upsert(
          {
            full_name: prospect.full_name,
            title: prospect.title,
            company: prospect.company,
            email: prospect.email,
            phone: prospect.phone,
            linkedin_url: prospect.linkedin_url,
            source_url: prospect.source_url,
            source_type: prospect.source_type || scraper.type,
            status: 'New',
            raw_data: prospect.raw_data,
          },
          {
            onConflict: 'email',
            ignoreDuplicates: true,
          }
        )

        if (error) {
          errors.push(`Failed to save ${prospect.full_name}: ${error.message}`)
        } else {
          savedCount++
        }
      } catch (err) {
        errors.push(
          `Failed to save ${prospect.full_name}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    }

    // Update scraper stats
    await supabase
      .from('scrapers')
      .update({
        last_run: new Date().toISOString(),
        total_runs: supabase.rpc('increment', { row_id: scraperId, increment_by: 1 }),
      })
      .eq('id', scraperId)

    // Record scrape job
    await supabase.from('scrape_jobs').insert({
      scraper_id: scraperId,
      status: errors.length > 0 ? 'partial' : 'completed',
      results_count: result.prospects.length,
      saved_count: savedCount,
      duration_ms: Date.now() - startTime,
      error_log: errors.length > 0 ? errors : null,
    })

    await job.updateProgress(100)

    const duration = Date.now() - startTime
    logger.info(
      {
        jobId: job.id,
        scraperId,
        duration,
        found: result.prospects.length,
        saved: savedCount,
      },
      'Scraper job completed'
    )

    // Emit completion event via WebSocket
    emitScraperComplete(
      job.id || '',
      scraperId,
      result.prospects.length,
      savedCount,
      duration
    )

    // Send notification
    emitNotification(
      `Scrape complete: ${savedCount} new prospects found`,
      'success'
    )

    return {
      success: true,
      data: {
        found: result.prospects.length,
        saved: savedCount,
        duplicates: result.prospects.length - savedCount,
        errors: errors.length,
      },
      metadata: {
        duration,
        pagesScraped: result.metadata.pagesScraped,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ jobId: job.id, scraperId, error: errorMessage }, 'Scraper job failed')

    // Emit error notification via WebSocket
    emitNotification(
      `Scrape failed: ${errorMessage}`,
      'error'
    )

    // Record failed job
    await supabase.from('scrape_jobs').insert({
      scraper_id: scraperId,
      status: 'failed',
      results_count: 0,
      duration_ms: Date.now() - startTime,
      error_log: [errorMessage],
    })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Create and start the scraper worker
 */
export function createScraperWorker(): Worker<ScraperJobData, JobResult> {
  const worker = new Worker<ScraperJobData, JobResult>(
    QUEUE_NAMES.SCRAPER,
    processScraperJob,
    {
      connection: getRedisConnection(),
      concurrency: 2, // Run up to 2 scrapers concurrently
      limiter: {
        max: 5,
        duration: 60000, // Max 5 jobs per minute
      },
    }
  )

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, result: result.success }, 'Scraper job completed')
  })

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Scraper job failed')
  })

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Scraper worker error')
  })

  logger.info('Scraper worker started')
  return worker
}

export default createScraperWorker
