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
 * Scraper rate limiter - very permissive for owner use
 * 1000 scrape jobs per hour (effectively unlimited)
 */
export const scraperRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Scraper rate limit exceeded',
  },
})

/**
 * Enrichment rate limiter - permissive for owner use
 * 500 enrichment jobs per hour
 */
export const enrichmentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Enrichment rate limit exceeded',
  },
})
