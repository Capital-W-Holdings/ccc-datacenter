import { useEffect, useState } from 'react'

interface AnnounceProps {
  message: string
  politeness?: 'polite' | 'assertive'
  clearAfter?: number
}

/**
 * Live region for screen reader announcements
 * Use for dynamic content updates that should be announced
 */
export function Announce({
  message,
  politeness = 'polite',
  clearAfter = 5000,
}: AnnounceProps) {
  const [announcement, setAnnouncement] = useState(message)

  useEffect(() => {
    setAnnouncement(message)

    if (clearAfter > 0 && message) {
      const timeout = setTimeout(() => {
        setAnnouncement('')
      }, clearAfter)

      return () => clearTimeout(timeout)
    }
  }, [message, clearAfter])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

/**
 * Hook for programmatically announcing messages to screen readers
 */
export function useAnnounce() {
  const [message, setMessage] = useState('')
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite')

  const announce = (text: string, level: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(level)
    // Clear first to ensure re-announcement
    setMessage('')
    requestAnimationFrame(() => {
      setMessage(text)
    })
  }

  return { message, politeness, announce }
}

export default Announce
