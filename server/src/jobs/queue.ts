import { Queue, QueueEvents, Job, ConnectionOptions } from 'bullmq'
import { createLogger } from '../utils/logger.js'

const logger = createLogger({ module: 'job-queue' })

// Redis connection URL
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Parse Redis URL into connection options for BullMQ
 */
function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  } catch {
    logger.warn({ url }, 'Failed to parse Redis URL, using defaults')
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  }
}

let connectionOptions: ConnectionOptions | null = null

/**
 * Get Redis connection options for BullMQ
 */
export function getRedisConnection(): ConnectionOptions {
  if (!connectionOptions) {
    connectionOptions = parseRedisUrl(REDIS_URL)
    logger.info({ url: REDIS_URL.replace(/:[^:@]+@/, ':****@') }, 'Redis connection configured')
  }
  return connectionOptions
}

/**
 * Rich progress data stored in job.data by workers
 */
export interface JobProgressData {
  stage?: string
  message?: string
  progress?: number
  urlsFound?: number
  prospectsFound?: number
  emailsFound?: number
  verifiedCount?: number
  duplicatesSkipped?: number
}

// Job types
export type ScraperJobData = {
  scraperId: string
  config: {
    urls: string[]
    keywords: string[]
    max_pages?: number
    selectors?: Record<string, string>
  }
  userId?: string
}

export type EnrichmentJobData = {
  prospectIds: string[]
  batchSize?: number
  userId?: string
}

export type ExportJobData = {
  format: 'xlsx' | 'csv' | 'pdf'
  filters?: Record<string, unknown>
  columns?: string[]
  userId?: string
}

export type ResearchJobData = {
  jobId: string
  query: string
  apiKey: string
  maxUrls?: number
  userId?: string
  lastProgress?: JobProgressData  // Rich progress stored by worker
}

export type JobData = ScraperJobData | EnrichmentJobData | ExportJobData | ResearchJobData

export interface JobResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

// Queue names
export const QUEUE_NAMES = {
  SCRAPER: 'ccc-scraper',
  ENRICHMENT: 'ccc-enrichment',
  EXPORT: 'ccc-export',
  RESEARCH: 'ccc-research',
} as const

// Queues
let scraperQueue: Queue<ScraperJobData, JobResult> | null = null
let enrichmentQueue: Queue<EnrichmentJobData, JobResult> | null = null
let exportQueue: Queue<ExportJobData, JobResult> | null = null
let researchQueue: Queue<ResearchJobData, JobResult> | null = null

/**
 * Get or create scraper queue
 */
export function getScraperQueue(): Queue<ScraperJobData, JobResult> {
  if (!scraperQueue) {
    scraperQueue = new Queue(QUEUE_NAMES.SCRAPER, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 50,
          age: 7 * 24 * 60 * 60, // 7 days
        },
      },
    })
  }
  return scraperQueue
}

/**
 * Get or create enrichment queue
 */
export function getEnrichmentQueue(): Queue<EnrichmentJobData, JobResult> {
  if (!enrichmentQueue) {
    enrichmentQueue = new Queue(QUEUE_NAMES.ENRICHMENT, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 10000,
        },
        removeOnComplete: {
          count: 200,
          age: 24 * 60 * 60,
        },
        removeOnFail: {
          count: 100,
          age: 3 * 24 * 60 * 60,
        },
      },
    })
  }
  return enrichmentQueue
}

/**
 * Get or create export queue
 */
export function getExportQueue(): Queue<ExportJobData, JobResult> {
  if (!exportQueue) {
    exportQueue = new Queue(QUEUE_NAMES.EXPORT, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 3000,
        },
        removeOnComplete: {
          count: 50,
          age: 60 * 60, // 1 hour
        },
        removeOnFail: {
          count: 20,
          age: 24 * 60 * 60,
        },
      },
    })
  }
  return exportQueue
}

/**
 * Get or create research queue
 */
export function getResearchQueue(): Queue<ResearchJobData, JobResult> {
  if (!researchQueue) {
    researchQueue = new Queue(QUEUE_NAMES.RESEARCH, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 1, // Research is expensive, don't retry automatically
        removeOnComplete: {
          count: 50,
          age: 24 * 60 * 60,
        },
        removeOnFail: {
          count: 20,
          age: 24 * 60 * 60,
        },
      },
    })
  }
  return researchQueue
}

/**
 * Queue events for real-time updates
 */
export function createQueueEvents(queueName: string): QueueEvents {
  return new QueueEvents(queueName, {
    connection: getRedisConnection(),
  })
}

/**
 * Add a scraper job
 */
export async function addScraperJob(
  scraperId: string,
  config: ScraperJobData['config'],
  options?: { priority?: number; delay?: number }
): Promise<Job<ScraperJobData, JobResult>> {
  const queue = getScraperQueue()
  const job = await queue.add(
    'scrape',
    { scraperId, config },
    {
      priority: options?.priority,
      delay: options?.delay,
    }
  )
  logger.info({ jobId: job.id, scraperId }, 'Scraper job added')
  return job
}

/**
 * Add an enrichment job
 */
export async function addEnrichmentJob(
  prospectIds: string[],
  batchSize?: number
): Promise<Job<EnrichmentJobData, JobResult>> {
  const queue = getEnrichmentQueue()
  const job = await queue.add('enrich', { prospectIds, batchSize })
  logger.info({ jobId: job.id, prospectCount: prospectIds.length }, 'Enrichment job added')
  return job
}

/**
 * Add an export job
 */
export async function addExportJob(
  format: ExportJobData['format'],
  filters?: Record<string, unknown>,
  columns?: string[]
): Promise<Job<ExportJobData, JobResult>> {
  const queue = getExportQueue()
  const job = await queue.add('export', { format, filters, columns })
  logger.info({ jobId: job.id, format }, 'Export job added')
  return job
}

/**
 * Add an AI research job
 */
export async function addResearchJob(
  jobId: string,
  data: { query: string; apiKey: string; maxUrls?: number }
): Promise<Job<ResearchJobData, JobResult>> {
  const queue = getResearchQueue()
  const job = await queue.add('research', { jobId, ...data }, { jobId })
  logger.info({ jobId: job.id, queryLength: data.query.length, maxUrls: data.maxUrls }, 'Research job added')
  return job
}

/**
 * Get job status
 */
export async function getJobStatus(
  queueName: string,
  jobId: string
): Promise<{
  id: string
  state: string
  progress: number
  progressData?: JobProgressData
  data: unknown
  result?: unknown
  failedReason?: string
} | null> {
  let queue: Queue | null = null

  switch (queueName) {
    case QUEUE_NAMES.SCRAPER:
      queue = getScraperQueue()
      break
    case QUEUE_NAMES.ENRICHMENT:
      queue = getEnrichmentQueue()
      break
    case QUEUE_NAMES.EXPORT:
      queue = getExportQueue()
      break
    case QUEUE_NAMES.RESEARCH:
      queue = getResearchQueue()
      break
  }

  if (!queue) return null

  const job = await queue.getJob(jobId)
  if (!job) return null

  const state = await job.getState()

  // Extract rich progress from job.data.lastProgress (set by workers)
  const jobData = job.data as Record<string, unknown>
  const progressData = jobData?.lastProgress as JobProgressData | undefined

  return {
    id: job.id || '',
    state,
    progress: job.progress as number,
    progressData,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
  }
}

/**
 * Get all jobs for a queue
 */
export async function getQueueJobs(
  queueName: string,
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'active'
): Promise<Job[]> {
  let queue: Queue | null = null

  switch (queueName) {
    case QUEUE_NAMES.SCRAPER:
      queue = getScraperQueue()
      break
    case QUEUE_NAMES.ENRICHMENT:
      queue = getEnrichmentQueue()
      break
    case QUEUE_NAMES.EXPORT:
      queue = getExportQueue()
      break
    case QUEUE_NAMES.RESEARCH:
      queue = getResearchQueue()
      break
  }

  if (!queue) return []

  return queue.getJobs([status], 0, 100)
}

/**
 * Cancel a job
 */
export async function cancelJob(queueName: string, jobId: string): Promise<boolean> {
  let queue: Queue | null = null

  switch (queueName) {
    case QUEUE_NAMES.SCRAPER:
      queue = getScraperQueue()
      break
    case QUEUE_NAMES.ENRICHMENT:
      queue = getEnrichmentQueue()
      break
    case QUEUE_NAMES.EXPORT:
      queue = getExportQueue()
      break
    case QUEUE_NAMES.RESEARCH:
      queue = getResearchQueue()
      break
  }

  if (!queue) return false

  const job = await queue.getJob(jobId)
  if (!job) return false

  await job.remove()
  logger.info({ queueName, jobId }, 'Job cancelled')
  return true
}

/**
 * Close all queues and connections
 */
export async function closeQueues(): Promise<void> {
  logger.info('Closing queues')

  if (scraperQueue) {
    await scraperQueue.close()
    scraperQueue = null
  }
  if (enrichmentQueue) {
    await enrichmentQueue.close()
    enrichmentQueue = null
  }
  if (exportQueue) {
    await exportQueue.close()
    exportQueue = null
  }
  if (researchQueue) {
    await researchQueue.close()
    researchQueue = null
  }
  // Connection options don't need to be closed (they're just config objects)
  connectionOptions = null
}
