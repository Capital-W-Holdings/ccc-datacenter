import rateLimit from 'express-rate-limit'

/**
 * Global rate limiter - 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health'
  },
})

/**
 * Strict rate limiter for sensitive operations (auth, exports)
 * 10 requests per 15 minutes
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded for this operation',
  },
})

/**
 * Scraper rate limiter - prevent abuse of scraping endpoints
 * 5 scrape jobs per hour
 */
export const scraperRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Scraper rate limit exceeded - max 5 jobs per hour',
  },
})

/**
 * Enrichment rate limiter - protect AI API usage
 * 20 enrichment jobs per hour
 */
export const enrichmentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Enrichment rate limit exceeded - max 20 jobs per hour',
  },
})
