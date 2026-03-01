import { useEffect, useCallback, useState } from 'react'

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta'

interface ShortcutConfig {
  key: string
  modifiers?: ModifierKey[]
  description: string
  action: () => void
  enabled?: boolean
}

interface KeyboardShortcutsOptions {
  enabled?: boolean
  preventDefault?: boolean
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

/**
 * Keyboard shortcuts hook for global keyboard navigation
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: KeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignore shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      // Check for help shortcut (?)
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault()
        setIsHelpOpen((prev) => !prev)
        return
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false
        if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false

        const modifiers = shortcut.modifiers || []
        const ctrlRequired = modifiers.includes('ctrl') || modifiers.includes('meta')
        const altRequired = modifiers.includes('alt')
        const shiftRequired = modifiers.includes('shift')

        // Handle ctrl/cmd cross-platform
        const ctrlPressed = isMac ? event.metaKey : event.ctrlKey

        if (ctrlRequired && !ctrlPressed) return false
        if (!ctrlRequired && ctrlPressed) return false
        if (altRequired !== event.altKey) return false
        if (shiftRequired !== event.shiftKey) return false

        return true
      })

      if (matchingShortcut) {
        if (preventDefault) {
          event.preventDefault()
        }
        matchingShortcut.action()
      }
    },
    [enabled, shortcuts, preventDefault]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    isHelpOpen,
    setIsHelpOpen,
    shortcuts: shortcuts.filter((s) => s.enabled !== false),
  }
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(key: string, modifiers: ModifierKey[] = []): string {
  const parts: string[] = []

  if (modifiers.includes('ctrl') || modifiers.includes('meta')) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (modifiers.includes('alt')) {
    parts.push(isMac ? '⌥' : 'Alt')
  }
  if (modifiers.includes('shift')) {
    parts.push('⇧')
  }

  // Format the key
  const formattedKey =
    key === 'ArrowUp'
      ? '↑'
      : key === 'ArrowDown'
        ? '↓'
        : key === 'ArrowLeft'
          ? '←'
          : key === 'ArrowRight'
            ? '→'
            : key === 'Escape'
              ? 'Esc'
              : key === 'Enter'
                ? '↵'
                : key.length === 1
                  ? key.toUpperCase()
                  : key

  parts.push(formattedKey)

  return parts.join(isMac ? '' : '+')
}

export default useKeyboardShortcuts
