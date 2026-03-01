import { useState, useRef, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, MapPin, MoreVertical, Eye, Sparkles, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Checkbox from '@/components/ui/Checkbox'
import type { Prospect } from '@/types'
import { cn, getScoreColor } from '@/lib/utils'

interface ProspectCardProps {
  prospect: Prospect
  isSelected: boolean
  onSelect: () => void
  onDeselect: () => void
  onClick: () => void
  onEnrich?: () => void
  onDelete?: () => void
}

const ProspectCard = forwardRef<HTMLDivElement, ProspectCardProps>(function ProspectCard({
  prospect,
  isSelected,
  onSelect,
  onDeselect,
  onClick,
  onEnrich,
  onDelete,
}, ref) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelected) {
      onDeselect()
    } else {
      onSelect()
    }
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'p-4 rounded-xl border transition-colors cursor-pointer',
        isSelected
          ? 'border-brand-gold bg-brand-gold/5'
          : 'border-border bg-white hover:border-brand-gold/30',
      )}
      onClick={onClick}
    >
      {/* Header: Name + Checkbox + Score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">
            {prospect.full_name}
          </h3>
          <p className="text-sm text-text-secondary truncate mt-0.5">
            {prospect.title || 'No title'}
          </p>
          <p className="text-sm text-text-muted truncate">
            {prospect.company || 'No company'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-lg font-mono font-bold',
              getScoreColor(prospect.relevance_score),
            )}
          >
            {prospect.relevance_score}
          </span>
          <div
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleCheckboxClick(e)
            }}
          >
            <Checkbox
              checked={isSelected}
              onChange={() => {}}
            />
          </div>
          {/* Action menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(!menuOpen)
              }}
              className="p-1.5 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 z-50 min-w-40 bg-white border border-border rounded-lg shadow-lg py-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onClick()
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface-secondary transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onEnrich?.()
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface-secondary transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Enrich
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onDelete?.()
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <Badge variant="status" status={prospect.status}>
          {prospect.status}
        </Badge>
        {prospect.company_type && (
          <Badge variant="default" className="text-xs">
            {prospect.company_type}
          </Badge>
        )}
        {prospect.ccc_verticals?.slice(0, 2).map((v) => (
          <Badge key={v} variant="vertical" vertical={v} className="text-xs">
            {v}
          </Badge>
        ))}
        {prospect.ccc_verticals && prospect.ccc_verticals.length > 2 && (
          <Badge variant="default" className="text-xs">
            +{prospect.ccc_verticals.length - 2}
          </Badge>
        )}
      </div>

      {/* Target roles */}
      {prospect.target_roles && prospect.target_roles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {prospect.target_roles.map((r) => (
            <Badge key={r} variant="role" role={r} className="text-xs">
              {r}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer: Location + LinkedIn */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <MapPin className="w-3.5 h-3.5" />
          <span>
            {prospect.location_city && prospect.location_state
              ? `${prospect.location_city}, ${prospect.location_state}`
              : prospect.location_city || 'Unknown'}
          </span>
        </div>
        {prospect.linkedin_url && (
          <a
            href={prospect.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-text-muted hover:text-brand-blue hover:bg-brand-blue/5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </motion.div>
  )
})

export default ProspectCard
