import { useEffect, useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react'

interface FocusTrapProps {
  children: ReactNode
  active?: boolean
  onEscape?: () => void
  initialFocus?: 'first' | 'last' | 'none'
}

/**
 * Traps focus within a container (useful for modals/dialogs)
 * Handles Tab, Shift+Tab, and Escape key
 */
export function FocusTrap({
  children,
  active = true,
  onEscape,
  initialFocus = 'first',
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ]

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(', '))
    ).filter((el) => el.offsetParent !== null) // Filter out hidden elements
  }, [])

  // Store previous focus and set initial focus
  useEffect(() => {
    if (!active) return

    previousFocusRef.current = document.activeElement as HTMLElement

    if (initialFocus !== 'none') {
      const focusables = getFocusableElements()
      if (focusables.length > 0) {
        const target = initialFocus === 'first' ? focusables[0] : focusables[focusables.length - 1]
        target.focus()
      }
    }

    // Restore focus on unmount
    return () => {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [active, initialFocus, getFocusableElements])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!active) return

      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      if (event.key !== 'Tab') return

      const focusables = getFocusableElements()
      if (focusables.length === 0) return

      const firstFocusable = focusables[0]
      const lastFocusable = focusables[focusables.length - 1]

      if (event.shiftKey) {
        // Shift + Tab: go to last element if at first
        if (document.activeElement === firstFocusable) {
          event.preventDefault()
          lastFocusable.focus()
        }
      } else {
        // Tab: go to first element if at last
        if (document.activeElement === lastFocusable) {
          event.preventDefault()
          firstFocusable.focus()
        }
      }
    },
    [active, onEscape, getFocusableElements]
  )

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}

export default FocusTrap
