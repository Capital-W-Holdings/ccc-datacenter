import pino from 'pino'

const isDevelopment = process.env.NODE_ENV !== 'production'

/**
 * Application logger using Pino
 * - Pretty print in development
 * - JSON in production for log aggregation
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Request logger middleware factory
 */
export function requestLogger() {
  return (req: { method: string; url: string; headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
    const start = Date.now()
    const requestId = req.headers['x-request-id'] || crypto.randomUUID()

    logger.info({
      type: 'request',
      requestId,
      method: req.method,
      url: req.url,
    })

    // Log response on finish
    const originalEnd = (_res as { end: (...args: unknown[]) => void }).end
    ;(_res as { end: (...args: unknown[]) => void }).end = function (this: unknown, ...args: unknown[]) {
      const duration = Date.now() - start
      logger.info({
        type: 'response',
        requestId,
        method: req.method,
        url: req.url,
        statusCode: (_res as { statusCode: number }).statusCode,
        duration,
      })
      return originalEnd.apply(this, args)
    }

    next()
  }
}

// Export default logger instance
export default logger
