import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

type EventHandler = (data: unknown) => void

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

/**
 * Get WebSocket URL based on environment
 */
function getDefaultWsUrl(): string {
  // Use explicit WS env var if provided
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }

  // Fall back to API URL if provided (WebSocket typically runs on same server)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // In development, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3001'
  }

  // In production, derive from window location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

/**
 * WebSocket hook for real-time updates
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = getDefaultWsUrl(),
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options

  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  })

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    const socket = io(url, {
      autoConnect: false,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setState({ isConnected: true, isConnecting: false, error: null })
    })

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false }))
    })

    socket.on('connect_error', (error) => {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message,
      }))
    })

    // Set up event forwarding
    socket.onAny((eventName: string, data: unknown) => {
      const handlers = handlersRef.current.get(eventName)
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data)
          } catch (err) {
            console.error(`Error in WebSocket handler for ${eventName}:`, err)
          }
        })
      }
    })

    socketRef.current = socket
    socket.connect()
  }, [url, reconnectionAttempts, reconnectionDelay])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  // Subscribe to rooms
  const subscribe = useCallback((rooms: string | string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', rooms)
    }
  }, [])

  // Unsubscribe from rooms
  const unsubscribe = useCallback((rooms: string | string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', rooms)
    }
  }, [])

  // Add event handler
  const on = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)

    // Return cleanup function
    return () => {
      handlersRef.current.get(event)?.delete(handler)
    }
  }, [])

  // Remove event handler
  const off = useCallback((event: string, handler?: EventHandler) => {
    if (handler) {
      handlersRef.current.get(event)?.delete(handler)
    } else {
      handlersRef.current.delete(event)
    }
  }, [])

  // Emit event
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    on,
    off,
    emit,
    socket: socketRef.current,
  }
}

/**
 * Hook for scraper progress updates
 */
export function useScraperProgress(scraperId?: string) {
  const { on, subscribe, unsubscribe, isConnected } = useWebSocket()
  const [progress, setProgress] = useState<{
    jobId: string
    progress: number
    current: number
    total: number
    message: string
  } | null>(null)

  useEffect(() => {
    if (!isConnected) return

    const room = scraperId ? `scraper:${scraperId}` : 'scrapers'
    subscribe(room)

    const cleanup = on('scraper:progress', (data) => {
      const event = data as {
        jobId: string
        scraperId: string
        progress: number
        current: number
        total: number
        message: string
      }
      if (!scraperId || event.scraperId === scraperId) {
        setProgress({
          jobId: event.jobId,
          progress: event.progress,
          current: event.current,
          total: event.total,
          message: event.message,
        })
      }
    })

    const cleanupComplete = on('scraper:complete', () => {
      setProgress(null)
    })

    return () => {
      cleanup()
      cleanupComplete()
      unsubscribe(room)
    }
  }, [isConnected, scraperId, on, subscribe, unsubscribe])

  return progress
}

/**
 * Hook for real-time notifications
 */
export function useNotifications() {
  const { on, isConnected } = useWebSocket()
  const [notifications, setNotifications] = useState<
    Array<{
      id: string
      message: string
      level: 'info' | 'success' | 'warning' | 'error'
      timestamp: string
    }>
  >([])

  useEffect(() => {
    if (!isConnected) return

    const cleanup = on('notification', (data) => {
      const event = data as {
        id: string
        message: string
        level: 'info' | 'success' | 'warning' | 'error'
        timestamp: string
      }
      setNotifications((prev) => [event, ...prev].slice(0, 50)) // Keep last 50
    })

    return cleanup
  }, [isConnected, on])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clear = useCallback(() => {
    setNotifications([])
  }, [])

  return { notifications, dismiss, clear }
}

export default useWebSocket
