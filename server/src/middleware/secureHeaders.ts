import helmet from 'helmet'

/**
 * Security headers middleware using Helmet
 */
export const secureHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'ws:'], // WebSocket connections
    },
  },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // Prevent MIME type sniffing
  noSniff: true,
  // XSS protection (legacy, but doesn't hurt)
  xssFilter: true,
  // HSTS - force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Don't send DNS prefetch hints
  dnsPrefetchControl: { allow: false },
})
