import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createLogger } from '../utils/logger.js'

const logger = createLogger({ module: 'websocket' })

let io: SocketIOServer | null = null

// Event types
export interface WSScraperProgress {
  type: 'scraper:progress'
  jobId: string
  scraperId: string
  progress: number
  current: number
  total: number
  message: string
}

export interface WSScraperComplete {
  type: 'scraper:complete'
  jobId: string
  scraperId: string
  resultCount: number
  savedCount: number
  duration: number
}

export interface WSScraperError {
  type: 'scraper:error'
  jobId: string
  scraperId: string
  error: string
}

export interface WSEnrichmentProgress {
  type: 'enrichment:progress'
  jobId: string
  current: number
  total: number
  prospectName?: string
}

export interface WSEnrichmentComplete {
  type: 'enrichment:complete'
  jobId: string
  enrichedCount: number
  failedCount: number
}

export interface WSNotification {
  type: 'notification'
  id: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
}

export type WSEvent =
  | WSScraperProgress
  | WSScraperComplete
  | WSScraperError
  | WSEnrichmentProgress
  | WSEnrichmentComplete
  | WSNotification

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN || 'http://localhost:5173'
        : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket: Socket) => {
    const clientId = socket.id
    logger.info({ clientId }, 'Client connected')

    // Join rooms based on client subscriptions
    socket.on('subscribe', (rooms: string | string[]) => {
      const roomList = Array.isArray(rooms) ? rooms : [rooms]
      roomList.forEach((room) => {
        socket.join(room)
        logger.debug({ clientId, room }, 'Client joined room')
      })
    })

    socket.on('unsubscribe', (rooms: string | string[]) => {
      const roomList = Array.isArray(rooms) ? rooms : [rooms]
      roomList.forEach((room) => {
        socket.leave(room)
        logger.debug({ clientId, room }, 'Client left room')
      })
    })

    socket.on('disconnect', (reason) => {
      logger.info({ clientId, reason }, 'Client disconnected')
    })

    socket.on('error', (error) => {
      logger.error({ clientId, error: error.message }, 'Socket error')
    })
  })

  logger.info('WebSocket server initialized')
  return io
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): SocketIOServer | null {
  return io
}

/**
 * Emit event to all connected clients
 */
export function broadcast(event: WSEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized, event not sent')
    return
  }
  io.emit(event.type, event)
}

/**
 * Emit event to a specific room
 */
export function emitToRoom(room: string, event: WSEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized, event not sent')
    return
  }
  io.to(room).emit(event.type, event)
}

/**
 * Emit scraper progress event
 */
export function emitScraperProgress(
  jobId: string,
  scraperId: string,
  progress: number,
  current: number,
  total: number,
  message: string
): void {
  const event: WSScraperProgress = {
    type: 'scraper:progress',
    jobId,
    scraperId,
    progress,
    current,
    total,
    message,
  }
  emitToRoom(`scraper:${scraperId}`, event)
  emitToRoom('scrapers', event)
}

/**
 * Emit scraper complete event
 */
export function emitScraperComplete(
  jobId: string,
  scraperId: string,
  resultCount: number,
  savedCount: number,
  duration: number
): void {
  const event: WSScraperComplete = {
    type: 'scraper:complete',
    jobId,
    scraperId,
    resultCount,
    savedCount,
    duration,
  }
  emitToRoom(`scraper:${scraperId}`, event)
  emitToRoom('scrapers', event)
}

/**
 * Emit enrichment progress event
 */
export function emitEnrichmentProgress(
  jobId: string,
  current: number,
  total: number,
  prospectName?: string
): void {
  const event: WSEnrichmentProgress = {
    type: 'enrichment:progress',
    jobId,
    current,
    total,
    prospectName,
  }
  emitToRoom('enrichment', event)
}

/**
 * Emit enrichment complete event
 */
export function emitEnrichmentComplete(
  jobId: string,
  enrichedCount: number,
  failedCount: number
): void {
  const event: WSEnrichmentComplete = {
    type: 'enrichment:complete',
    jobId,
    enrichedCount,
    failedCount,
  }
  emitToRoom('enrichment', event)
}

/**
 * Emit notification to all clients
 */
export function emitNotification(
  message: string,
  level: 'info' | 'success' | 'warning' | 'error' = 'info'
): void {
  const event: WSNotification = {
    type: 'notification',
    id: crypto.randomUUID(),
    message,
    level,
    timestamp: new Date().toISOString(),
  }
  broadcast(event)
}

/**
 * Get connected client count
 */
export function getConnectedClientCount(): number {
  if (!io) return 0
  return io.sockets.sockets.size
}

/**
 * Close WebSocket server
 */
export async function closeWebSocket(): Promise<void> {
  if (io) {
    logger.info('Closing WebSocket server')
    await io.close()
    io = null
  }
}
