import { X, Keyboard } from 'lucide-react'
import { formatShortcut } from '../../hooks/useKeyboardShortcuts'
import { FocusTrap } from './FocusTrap'

interface ShortcutItem {
  key: string
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  description: string
}

interface ShortcutSection {
  title: string
  shortcuts: ShortcutItem[]
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
  sections: ShortcutSection[]
}

/**
 * Keyboard shortcuts help dialog
 * Shows all available shortcuts organized by section
 */
export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  sections,
}: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Keyboard className="h-5 w-5 text-gray-500" aria-hidden="true" />
              <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900">
                Keyboard Shortcuts
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close shortcuts help"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
                    {section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.shortcuts.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2"
                      >
                        <span className="text-sm text-gray-700">{shortcut.description}</span>
                        <kbd className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs text-gray-600">
                          {formatShortcut(shortcut.key, shortcut.modifiers)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-md bg-gray-100 p-4 text-center text-sm text-gray-500">
              Press <kbd className="rounded bg-white px-2 py-0.5 font-mono">?</kbd> to toggle this
              help dialog
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}

// Default shortcuts for the application
export const defaultShortcuts: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'g', modifiers: ['ctrl'], description: 'Go to Dashboard' },
      { key: 'p', modifiers: ['ctrl'], description: 'Go to Prospects' },
      { key: 'r', modifiers: ['ctrl'], description: 'Go to Research' },
      { key: 's', modifiers: ['ctrl'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Table Navigation',
    shortcuts: [
      { key: 'j', description: 'Move to next row' },
      { key: 'k', description: 'Move to previous row' },
      { key: 'x', description: 'Select/deselect row' },
      { key: 'Enter', description: 'Open selected item' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { key: 'k', modifiers: ['ctrl'], description: 'Open search' },
      { key: 'e', modifiers: ['ctrl'], description: 'Export selected' },
      { key: 'n', modifiers: ['ctrl'], description: 'New item' },
      { key: 'Escape', description: 'Close panel/dialog' },
    ],
  },
]

export default KeyboardShortcutsHelp
