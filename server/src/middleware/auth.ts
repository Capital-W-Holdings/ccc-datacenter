import { Request, Response, NextFunction } from 'express'

/**
 * Simple API key authentication middleware for single-user mode
 * Checks for APP_SECRET in Authorization header or x-api-key header
 */

const APP_SECRET = process.env.APP_SECRET

// List of public endpoints that don't require auth
const PUBLIC_PATHS = ['/api/health', '/health']

/**
 * Middleware to skip auth for public endpoints
 */
export function publicEndpoints(req: Request, _res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.some((path) => req.path === path || req.path.startsWith(path + '/'))) {
    // Skip to next middleware, bypassing auth
    return next('route')
  }
  next()
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth in development if no secret is set
  if (!APP_SECRET) {
    console.warn('Warning: APP_SECRET not set, authentication disabled')
    return next()
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === APP_SECRET) {
      return next()
    }
  }

  // Check x-api-key header
  const apiKey = req.headers['x-api-key']
  if (apiKey === APP_SECRET) {
    return next()
  }

  // Check query parameter (for downloads, webhooks)
  if (req.query.api_key === APP_SECRET) {
    return next()
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized - Invalid or missing API key',
  })
}

/**
 * Optional auth - allows requests through but marks them as authenticated or not
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const apiKey = req.headers['x-api-key']

  ;(req as Request & { isAuthenticated: boolean }).isAuthenticated =
    (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === APP_SECRET) ||
    apiKey === APP_SECRET

  next()
}
