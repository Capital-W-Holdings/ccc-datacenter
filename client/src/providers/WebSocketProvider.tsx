import { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { useWebSocket, useNotifications } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'

// Create context with the return type of useWebSocket
type WebSocketContextType = ReturnType<typeof useWebSocket>

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
}

/**
 * WebSocket Provider - provides real-time connection throughout the app
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useWebSocket()

  return (
    <WebSocketContext.Provider value={ws}>
      <NotificationsListener />
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Hook to access WebSocket context
 */
export function useWS() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWS must be used within a WebSocketProvider')
  }
  return context
}

/**
 * Component that listens for notifications and displays toasts
 */
function NotificationsListener() {
  const { notifications } = useNotifications()
  const lastNotificationRef = useRef<string | null>(null)

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0]

      // Prevent duplicate toasts
      if (latest.id === lastNotificationRef.current) {
        return
      }
      lastNotificationRef.current = latest.id

      // Show toast based on level
      switch (latest.level) {
        case 'success':
          toast.success(latest.message)
          break
        case 'error':
          toast.error(latest.message)
          break
        case 'warning':
          toast(latest.message, { icon: '⚠️' })
          break
        default:
          toast(latest.message)
      }
    }
  }, [notifications])

  return null
}

export default WebSocketProvider
