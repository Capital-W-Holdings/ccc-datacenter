import { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Eye,
  Sparkles,
  ExternalLink,
  Download,
  CheckCircle,
  Trash2,
  Copy,
  Mail,
  type LucideIcon,
} from 'lucide-react'
import type { Prospect } from '@/types'
import { cn } from '@/lib/utils'

interface ProspectContextMenuProps {
  prospect: Prospect
  position: { x: number; y: number }
  onClose: () => void
  onViewDetails: () => void
  onEnrich: () => void
  onExport: () => void
  onUpdateStatus: (status: string) => void
  onDelete: () => void
}

type MenuItem =
  | { type: 'action'; key: string; label: string; icon: LucideIcon; danger?: boolean }
  | { type: 'divider' }

const menuItems: MenuItem[] = [
  { type: 'action', key: 'view', label: 'View Details', icon: Eye },
  { type: 'action', key: 'enrich', label: 'Enrich with AI', icon: Sparkles },
  { type: 'divider' },
  { type: 'action', key: 'linkedin', label: 'Open LinkedIn', icon: ExternalLink },
  { type: 'action', key: 'copy-email', label: 'Copy Email', icon: Copy },
  { type: 'action', key: 'send-email', label: 'Send Email', icon: Mail },
  { type: 'divider' },
  { type: 'action', key: 'status-qualified', label: 'Mark as Qualified', icon: CheckCircle },
  { type: 'action', key: 'export', label: 'Export', icon: Download },
  { type: 'divider' },
  { type: 'action', key: 'delete', label: 'Delete', icon: Trash2, danger: true },
]

export default function ProspectContextMenu({
  prospect,
  position,
  onClose,
  onViewDetails,
  onEnrich,
  onExport,
  onUpdateStatus,
  onDelete,
}: ProspectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuDimensions, setMenuDimensions] = useState({ width: 208, height: 350 })

  // Measure menu dimensions after render
  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      setMenuDimensions({ width: rect.width, height: rect.height })
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Calculate adjusted position with viewport boundary detection
  const adjustedPosition = useMemo(() => {
    const padding = 8 // Minimum distance from viewport edge
    const { width, height } = menuDimensions

    // Check if menu would overflow right edge
    let x = position.x
    if (position.x + width + padding > window.innerWidth) {
      x = position.x - width // Show to the left of cursor
    }
    // Ensure not off left edge
    x = Math.max(padding, x)

    // Check if menu would overflow bottom edge
    let y = position.y
    if (position.y + height + padding > window.innerHeight) {
      y = window.innerHeight - height - padding
    }
    // Ensure not off top edge
    y = Math.max(padding, y)

    return { x, y }
  }, [position, menuDimensions])

  const handleAction = (key: string) => {
    switch (key) {
      case 'view':
        onViewDetails()
        break
      case 'enrich':
        onEnrich()
        break
      case 'linkedin':
        if (prospect.linkedin_url) {
          window.open(prospect.linkedin_url, '_blank')
        }
        break
      case 'copy-email':
        if (prospect.email) {
          navigator.clipboard.writeText(prospect.email)
        }
        break
      case 'send-email':
        if (prospect.email) {
          window.location.href = `mailto:${prospect.email}`
        }
        break
      case 'status-qualified':
        onUpdateStatus('Qualified')
        break
      case 'export':
        onExport()
        break
      case 'delete':
        onDelete()
        break
    }
    onClose()
  }

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 min-w-52 bg-white border border-border rounded-xl shadow-xl py-1.5 overflow-hidden"
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x,
      }}
    >
      {/* Prospect info header */}
      <div className="px-3 py-2 border-b border-border mb-1">
        <p className="font-medium text-text-primary text-sm truncate">
          {prospect.full_name}
        </p>
        <p className="text-xs text-text-muted truncate">
          {prospect.company || 'No company'}
        </p>
      </div>

      {/* Menu items */}
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div
              key={`divider-${index}`}
              className="border-t border-border my-1"
            />
          )
        }

        const isDisabled =
          (item.key === 'linkedin' && !prospect.linkedin_url) ||
          (item.key === 'copy-email' && !prospect.email) ||
          (item.key === 'send-email' && !prospect.email)

        const isDanger = item.danger === true
        const Icon = item.icon

        return (
          <button
            key={item.key}
            onClick={() => !isDisabled && handleAction(item.key)}
            disabled={isDisabled}
            className={cn(
              'w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 transition-colors',
              isDisabled && 'opacity-40 cursor-not-allowed',
              !isDisabled && isDanger && 'text-red-600 hover:bg-red-50',
              !isDisabled && !isDanger && 'text-text-primary hover:bg-surface-secondary',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </motion.div>
  )
}
