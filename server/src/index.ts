import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'

// Load environment variables first
dotenv.config()

// Security middleware
import { secureHeaders } from './middleware/secureHeaders.js'
import { authMiddleware, publicEndpoints } from './middleware/auth.js'
import {
  globalRateLimiter,
  strictRateLimiter,
  scraperRateLimiter,
  enrichmentRateLimiter,
} from './middleware/rateLimit.js'

// Logging
import { logger, requestLogger } from './utils/logger.js'

// WebSocket
import { initializeWebSocket, closeWebSocket } from './websocket/server.js'

// Background Workers
import { createScraperWorker } from './jobs/workers/scraper.worker.js'
import { createEnrichmentWorker } from './jobs/workers/enrichment.worker.js'
import { createExportWorker } from './jobs/workers/export.worker.js'
import { createResearchWorker } from './jobs/workers/research.worker.js'

// Routes
import { dashboardRoutes } from './routes/dashboard.js'
import { prospectsRoutes } from './routes/prospects.js'
import { scrapersRoutes } from './routes/scrapers.js'
import { enrichmentRoutes } from './routes/enrichment.js'
import { exportRoutes } from './routes/export.js'
import { settingsRoutes } from './routes/settings.js'
import { targetCompaniesRoutes } from './routes/targetCompanies.js'
import { researchRoutes } from './routes/research.js'
import { hunterRoutes } from './routes/hunter.js'
import { eventsRoutes } from './routes/events.js'

const app = express()
const PORT = process.env.PORT || 3001

// Determine CORS origin - supports multiple origins including Vercel preview deployments
const getCorsOrigin = () => {
  // In development, allow all origins
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const primaryOrigin = process.env.CORS_ORIGIN?.trim()

  // Return a function that validates origins dynamically
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // Allow the primary configured origin
    if (primaryOrigin && origin === primaryOrigin) {
      return callback(null, true)
    }

    // Allow any Vercel deployment (production and preview)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true)
    }

    // Log rejected origins for debugging
    console.log('[CORS] Rejected origin:', origin)
    callback(new Error('Not allowed by CORS'))
  }
}

// Log CORS config at startup for debugging
console.log('[CORS] NODE_ENV:', process.env.NODE_ENV)
console.log('[CORS] CORS_ORIGIN env:', process.env.CORS_ORIGIN)
console.log('[CORS] Mode:', process.env.NODE_ENV === 'production' ? 'dynamic (allows *.vercel.app)' : 'permissive (all origins)')

// ===========================
// SECURITY MIDDLEWARE STACK
// ===========================

// 1. Security headers (Helmet)
app.use(secureHeaders)

// 2. CORS configuration
app.use(
  cors({
    origin: getCorsOrigin(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  })
)

// 3. Body parsing with size limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 4. Request logging
app.use(requestLogger())

// 5. Global rate limiting
app.use(globalRateLimiter)

// ===========================
// PUBLIC ENDPOINTS (no auth)
// ===========================

// Health check - no auth required
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
})

// Debug endpoint - shows which env vars are configured (not values)
app.get('/api/debug/env', (_req, res) => {
  res.json({
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    REDIS_URL: !!process.env.REDIS_URL,
    APP_SECRET: !!process.env.APP_SECRET,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
  })
})

// ===========================
// PROTECTED ROUTES
// ===========================

// Apply auth middleware to all /api routes (except health check)
app.use('/api', publicEndpoints, authMiddleware)

// API Routes with route-specific rate limiting
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/prospects', prospectsRoutes)
app.use('/api/scrapers', scraperRateLimiter, scrapersRoutes)
app.use('/api/enrichment', enrichmentRateLimiter, enrichmentRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/settings', strictRateLimiter, settingsRoutes)
app.use('/api/target-companies', targetCompaniesRoutes)
app.use('/api/research', scraperRateLimiter, researchRoutes)
app.use('/api/hunter', enrichmentRateLimiter, hunterRoutes)
app.use('/api/events', eventsRoutes)

// ===========================
// ERROR HANDLING
// ===========================

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = req.headers['x-request-id'] || 'unknown'

  // Log the error with context
  logger.error({
    type: 'error',
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    method: req.method,
    url: req.url,
  })

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production'
  const statusCode = (err as { statusCode?: number }).statusCode || 500

  res.status(statusCode).json({
    success: false,
    error: isProduction && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

// 404 handler
app.use((req, res) => {
  logger.warn({
    type: 'not_found',
    method: req.method,
    url: req.url,
    requestId: req.headers['x-request-id'] || 'unknown',
  })

  res.status(404).json({
    success: false,
    error: 'Not found',
  })
})

// ===========================
// SERVER STARTUP
// ===========================

// Create HTTP server for both Express and WebSocket
const httpServer = createServer(app)

// Initialize WebSocket server (stored for potential direct access later)
initializeWebSocket(httpServer)
logger.info({ type: 'websocket', message: 'WebSocket server initialized' })

// Start background workers (requires Redis)
let scraperWorker: ReturnType<typeof createScraperWorker> | null = null
let enrichmentWorker: ReturnType<typeof createEnrichmentWorker> | null = null
let exportWorker: ReturnType<typeof createExportWorker> | null = null
let workersStarted = false

if (!process.env.REDIS_URL) {
  logger.error({
    type: 'startup',
    message: '⚠️  REDIS_URL not configured - Background workers DISABLED',
    impact: [
      'Scraper jobs will NOT process (mock data only)',
      'Enrichment jobs will NOT process',
      'Export jobs will NOT complete',
    ],
  })
  console.error(`
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  CRITICAL: REDIS_URL environment variable not set!        ║
║                                                               ║
║  The following features will NOT work:                        ║
║  • Scraper jobs (will return mock data only)                  ║
║  • AI Enrichment (jobs will queue but never process)          ║
║  • Exports (jobs will queue but never complete)               ║
║                                                               ║
║  To fix: Set REDIS_URL=redis://localhost:6379 in .env         ║
║  Or run: docker run -p 6379:6379 redis:alpine                 ║
╚═══════════════════════════════════════════════════════════════╝
  `)
} else {
  try {
    scraperWorker = createScraperWorker()
    enrichmentWorker = createEnrichmentWorker()
    exportWorker = createExportWorker()
    createResearchWorker() // Research worker is started but reference not stored
    workersStarted = true
    logger.info({ type: 'workers', message: 'Background workers started (scraper, enrichment, export, research)' })
  } catch (error) {
    const errorMessage = (error as Error).message
    logger.error({
      type: 'workers',
      error: errorMessage,
      message: 'Failed to start workers - check Redis connection',
    })
    console.error(`
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  Failed to connect to Redis!                              ║
║                                                               ║
║  Error: ${errorMessage.slice(0, 50).padEnd(50)}║
║                                                               ║
║  Background workers are DISABLED.                             ║
║  Check that Redis is running at: ${(process.env.REDIS_URL || '').slice(0, 30).padEnd(30)}║
╚═══════════════════════════════════════════════════════════════╝
    `)
  }
}

const server = httpServer.listen(PORT, () => {
  logger.info({
    type: 'startup',
    message: 'CCC Summit Intelligence Server started',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    authEnabled: !!process.env.APP_SECRET,
    webSocketEnabled: true,
    workersEnabled: workersStarted,
  })

  // Also log the banner for visibility in dev
  if (process.env.NODE_ENV !== 'production') {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   CCC Summit Intelligence Server                              ║
║   Data Center Dealmakers Summit Pipeline                      ║
║                                                               ║
║   Server running on http://localhost:${PORT}                    ║
║   Auth: ${(process.env.APP_SECRET ? 'ENABLED ✓' : 'DISABLED (set APP_SECRET)').padEnd(30)}         ║
║   WebSocket: ENABLED ✓                                        ║
║   Workers: ${(workersStarted ? 'ENABLED ✓' : 'DISABLED ✗ (see error above)').padEnd(30)}        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `)
  }
})

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info({ type: 'shutdown', message: `${signal} received, shutting down gracefully` })

  // Close WebSocket server
  await closeWebSocket()
  logger.info({ type: 'shutdown', message: 'WebSocket server closed' })

  // Close background workers
  if (scraperWorker) {
    await scraperWorker.close()
  }
  if (enrichmentWorker) {
    await enrichmentWorker.close()
  }
  if (exportWorker) {
    await exportWorker.close()
  }
  logger.info({ type: 'shutdown', message: 'Workers closed' })

  // Close HTTP server
  server.close(() => {
    logger.info({ type: 'shutdown', message: 'Server closed' })
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default app
