import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutDashboard,
  Users,
  FlaskConical,
  Sparkles,
  Download,
  Settings,
  FileDown,
  Play,
  Command,
  ArrowRight,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  category: 'navigation' | 'action' | 'search'
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Define available commands
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'View pipeline overview and stats',
        icon: <LayoutDashboard className="w-4 h-4" />,
        shortcut: 'G D',
        category: 'navigation',
        action: () => {
          navigate('/dashboard')
          onClose()
        },
      },
      {
        id: 'nav-prospects',
        label: 'Go to Prospects',
        description: 'View and manage all prospects',
        icon: <Users className="w-4 h-4" />,
        shortcut: 'G P',
        category: 'navigation',
        action: () => {
          navigate('/prospects')
          onClose()
        },
      },
      {
        id: 'nav-research',
        label: 'Go to Research',
        description: 'Run scrapers and gather data',
        icon: <FlaskConical className="w-4 h-4" />,
        shortcut: 'G R',
        category: 'navigation',
        action: () => {
          navigate('/research')
          onClose()
        },
      },
      {
        id: 'nav-enrichment',
        label: 'Go to Enrichment',
        description: 'Enrich prospect profiles with AI',
        icon: <Sparkles className="w-4 h-4" />,
        shortcut: 'G E',
        category: 'navigation',
        action: () => {
          navigate('/enrichment')
          onClose()
        },
      },
      {
        id: 'nav-export',
        label: 'Go to Export',
        description: 'Export data to Excel, CSV, or PDF',
        icon: <Download className="w-4 h-4" />,
        shortcut: 'G X',
        category: 'navigation',
        action: () => {
          navigate('/export')
          onClose()
        },
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'Configure application settings',
        icon: <Settings className="w-4 h-4" />,
        shortcut: 'G S',
        category: 'navigation',
        action: () => {
          navigate('/settings')
          onClose()
        },
      },
      // Actions
      {
        id: 'action-export-excel',
        label: 'Export to Excel',
        description: 'Quick export all prospects to XLSX',
        icon: <FileDown className="w-4 h-4" />,
        category: 'action',
        action: () => {
          navigate('/export?format=xlsx')
          onClose()
        },
      },
      {
        id: 'action-run-scraper',
        label: 'Run Scraper',
        description: 'Start a new scraping job',
        icon: <Play className="w-4 h-4" />,
        category: 'action',
        action: () => {
          navigate('/research')
          onClose()
        },
      },
    ],
    [navigate, onClose]
  )

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands

    const searchLower = search.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(searchLower) ||
        cmd.description?.toLowerCase().includes(searchLower)
    )
  }, [commands, search])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      search: [],
    }
    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [filteredCommands, selectedIndex, onClose]
  )

  // Scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return

    const selectedEl = listEl.querySelector(`[data-index="${selectedIndex}"]`)
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigate',
    action: 'Actions',
    search: 'Search Results',
  }

  let globalIndex = -1

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Command palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="bg-surface-primary border border-border-primary rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary">
                <Search className="w-5 h-5 text-text-tertiary" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none text-sm"
                />
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-mono text-text-tertiary bg-surface-secondary rounded border border-border-primary">
                  <Command className="w-3 h-3" />K
                </kbd>
              </div>

              {/* Commands list */}
              <div
                ref={listRef}
                className="max-h-[400px] overflow-y-auto p-2"
              >
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-text-tertiary text-sm">
                    No commands found for "{search}"
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, items]) => {
                    if (items.length === 0) return null

                    return (
                      <div key={category} className="mb-2 last:mb-0">
                        <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                          {categoryLabels[category]}
                        </div>
                        {items.map((cmd) => {
                          globalIndex++
                          const isSelected = globalIndex === selectedIndex
                          const currentIndex = globalIndex

                          return (
                            <button
                              key={cmd.id}
                              data-index={currentIndex}
                              onClick={() => cmd.action()}
                              onMouseEnter={() => setSelectedIndex(currentIndex)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                isSelected
                                  ? 'bg-brand-gold/10 text-brand-gold'
                                  : 'text-text-primary hover:bg-surface-secondary'
                              }`}
                            >
                              <span
                                className={
                                  isSelected
                                    ? 'text-brand-gold'
                                    : 'text-text-tertiary'
                                }
                              >
                                {cmd.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {cmd.label}
                                </div>
                                {cmd.description && (
                                  <div className="text-xs text-text-tertiary truncate">
                                    {cmd.description}
                                  </div>
                                )}
                              </div>
                              {cmd.shortcut && (
                                <kbd className="text-xs font-mono text-text-tertiary">
                                  {cmd.shortcut}
                                </kbd>
                              )}
                              {isSelected && (
                                <ArrowRight className="w-4 h-4 text-brand-gold" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border-primary bg-surface-secondary text-xs text-text-tertiary">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-primary border border-border-primary rounded text-[10px]">
                      ↑↓
                    </kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-primary border border-border-primary rounded text-[10px]">
                      ↵
                    </kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-primary border border-border-primary rounded text-[10px]">
                      esc
                    </kbd>
                    close
                  </span>
                </div>
                <span className="text-brand-gold/60">CCC Summit Intel</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to manage command palette state
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘+K or Ctrl+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  }
}
