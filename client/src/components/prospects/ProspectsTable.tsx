import { useRef, useCallback, useState, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence } from 'framer-motion'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from 'lucide-react'
import Checkbox from '@/components/ui/Checkbox'
import Badge from '@/components/ui/Badge'
import { EmailConfidenceDot } from '@/components/ui/EmailConfidenceBadge'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import EmptyState from '@/components/common/EmptyState'
import ProspectContextMenu from './ProspectContextMenu'
import type { Prospect } from '@/types'
import { useAppStore } from '@/stores/app'
import { cn, getScoreColor, truncate } from '@/lib/utils'

interface ProspectsTableProps {
  prospects: Prospect[]
  loading: boolean
  total: number
  onEnrich?: (prospectId: string) => void
  onExport?: (prospectId: string) => void
  onDelete?: (prospectId: string) => void
  onUpdateStatus?: (prospectId: string, status: string) => void
}

const columns = [
  { key: 'full_name', label: 'Name', width: 200 },
  { key: 'title', label: 'Title', width: 180 },
  { key: 'company', label: 'Company', width: 160 },
  { key: 'email', label: 'Email', width: 180 },
  { key: 'company_type', label: 'Type', width: 120 },
  { key: 'ccc_verticals', label: 'Verticals', width: 150 },
  { key: 'target_roles', label: 'Roles', width: 140 },
  { key: 'relevance_score', label: 'Score', width: 80 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'location_city', label: 'Location', width: 120 },
] as const

export default function ProspectsTable({
  prospects,
  loading,
  onEnrich,
  onExport,
  onDelete,
  onUpdateStatus,
}: ProspectsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const {
    sort,
    setSort,
    selectedProspectIds,
    selectProspect,
    deselectProspect,
    selectAllProspects,
    clearSelection,
    openDetailPanel,
  } = useAppStore()

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const lastSelectedIndexRef = useRef<number | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    prospect: Prospect
    position: { x: number; y: number }
  } | null>(null)

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: prospects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Row height
    overscan: 10,
  })

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }
      // Skip if modifier keys (let CommandPalette handle those)
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // Skip if no prospects
      if (prospects.length === 0) return

      switch (e.key.toLowerCase()) {
        case 'j': // Next row
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = Math.min((prev ?? -1) + 1, prospects.length - 1)
            rowVirtualizer.scrollToIndex(next, { align: 'auto' })
            return next
          })
          break

        case 'k': // Previous row
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = Math.max((prev ?? 0) - 1, 0)
            rowVirtualizer.scrollToIndex(next, { align: 'auto' })
            return next
          })
          break

        case 'x': // Toggle selection
          e.preventDefault()
          if (focusedIndex !== null && prospects[focusedIndex]) {
            const id = prospects[focusedIndex].id
            if (selectedProspectIds.has(id)) {
              deselectProspect(id)
            } else {
              selectProspect(id)
            }
            lastSelectedIndexRef.current = focusedIndex
          }
          break

        case 'enter': // Open detail panel
          e.preventDefault()
          if (focusedIndex !== null && prospects[focusedIndex]) {
            openDetailPanel(prospects[focusedIndex].id)
          }
          break

        case 'escape': // Clear focus
          setFocusedIndex(null)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    focusedIndex,
    prospects,
    selectedProspectIds,
    selectProspect,
    deselectProspect,
    openDetailPanel,
    rowVirtualizer,
  ])

  // Reset focus when prospects change
  useEffect(() => {
    setFocusedIndex(null)
    lastSelectedIndexRef.current = null
  }, [prospects.length])

  const handleSelectAll = useCallback(() => {
    if (selectedProspectIds.size === prospects.length) {
      clearSelection()
    } else {
      selectAllProspects(prospects.map((p) => p.id))
    }
  }, [prospects, selectedProspectIds.size, selectAllProspects, clearSelection])

  const handleRowClick = (prospect: Prospect, index: number) => {
    setFocusedIndex(index)
    openDetailPanel(prospect.id)
  }

  const handleContextMenu = (
    e: React.MouseEvent,
    prospect: Prospect,
    index: number,
  ) => {
    e.preventDefault()
    setFocusedIndex(index)
    setContextMenu({
      prospect,
      position: { x: e.clientX, y: e.clientY },
    })
  }

  const handleCheckboxClick = (
    e: React.MouseEvent,
    prospectId: string,
    isSelected: boolean,
    currentIndex: number,
  ) => {
    e.stopPropagation()

    // Shift+Click range selection
    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, currentIndex)
      const end = Math.max(lastSelectedIndexRef.current, currentIndex)

      for (let i = start; i <= end; i++) {
        if (prospects[i]) {
          selectProspect(prospects[i].id)
        }
      }
    } else {
      // Single toggle
      if (isSelected) {
        deselectProspect(prospectId)
      } else {
        selectProspect(prospectId)
      }
    }

    lastSelectedIndexRef.current = currentIndex
    setFocusedIndex(currentIndex)
  }

  const getSortIcon = (columnKey: string) => {
    if (sort.column !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-brand-gold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-brand-gold" />
    )
  }

  if (loading) {
    return (
      <div className="h-full bg-white rounded-xl border border-border overflow-hidden">
        <TableSkeleton rows={12} />
      </div>
    )
  }

  if (prospects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-xl border border-border">
        <EmptyState type="no-results" />
      </div>
    )
  }

  const allSelected = selectedProspectIds.size === prospects.length

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-border overflow-hidden">
      {/* Table header */}
      <div className="flex items-center bg-surface-secondary border-b border-border sticky top-0 z-10">
        {/* Checkbox column */}
        <div className="w-12 flex-shrink-0 px-3 py-3">
          <Checkbox
            checked={allSelected}
            onChange={handleSelectAll}
          />
        </div>

        {/* Data columns */}
        {columns.map((col) => (
          <button
            key={col.key}
            onClick={() => setSort(col.key as keyof Prospect)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-3 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors text-left',
            )}
            style={{ width: col.width, minWidth: col.width }}
          >
            {col.label}
            {getSortIcon(col.key)}
          </button>
        ))}

        {/* Actions column */}
        <div className="w-12 flex-shrink-0" />
      </div>

      {/* Virtual scrolling container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const prospect = prospects[virtualRow.index]
            const isSelected = selectedProspectIds.has(prospect.id)
            const isFocused = virtualRow.index === focusedIndex

            return (
              <div
                key={prospect.id}
                onClick={() => handleRowClick(prospect, virtualRow.index)}
                onContextMenu={(e) => handleContextMenu(e, prospect, virtualRow.index)}
                className={cn(
                  'absolute left-0 right-0 flex items-center border-b border-border-light cursor-pointer transition-colors',
                  isSelected && 'bg-brand-gold/5',
                  !isSelected && !isFocused && 'hover:bg-surface-secondary',
                  isFocused && 'ring-2 ring-inset ring-brand-gold/50 bg-brand-gold/5',
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Checkbox */}
                <div
                  className="w-12 flex-shrink-0 px-3"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleCheckboxClick(e, prospect.id, isSelected, virtualRow.index)
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {}}
                  />
                </div>

                {/* Name */}
                <div
                  className="px-3 truncate"
                  style={{ width: 200, minWidth: 200 }}
                >
                  <p className="font-medium text-text-primary truncate">
                    {prospect.full_name}
                  </p>
                </div>

                {/* Title */}
                <div
                  className="px-3 text-sm text-text-secondary truncate"
                  style={{ width: 180, minWidth: 180 }}
                >
                  {truncate(prospect.title || '-', 25)}
                </div>

                {/* Company */}
                <div
                  className="px-3 text-sm text-text-primary truncate"
                  style={{ width: 160, minWidth: 160 }}
                >
                  {prospect.company || '-'}
                </div>

                {/* Email */}
                <div
                  className="px-3 flex items-center gap-1.5 text-sm text-text-secondary truncate"
                  style={{ width: 180, minWidth: 180 }}
                >
                  {prospect.email ? (
                    <>
                      <EmailConfidenceDot
                        verified={prospect.email_verified}
                        confidence={prospect.hunter_confidence}
                        source={prospect.email_source}
                      />
                      <span className="truncate">{prospect.email}</span>
                    </>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </div>

                {/* Company Type */}
                <div
                  className="px-3"
                  style={{ width: 120, minWidth: 120 }}
                >
                  {prospect.company_type && (
                    <Badge variant="default" className="text-xs">
                      {prospect.company_type}
                    </Badge>
                  )}
                </div>

                {/* Verticals */}
                <div
                  className="px-3 flex gap-1 overflow-hidden"
                  style={{ width: 150, minWidth: 150 }}
                >
                  {prospect.ccc_verticals?.slice(0, 2).map((v) => (
                    <Badge key={v} variant="vertical" vertical={v} className="text-xs">
                      {v.slice(0, 3)}
                    </Badge>
                  ))}
                  {prospect.ccc_verticals?.length > 2 && (
                    <span className="text-xs text-text-muted">
                      +{prospect.ccc_verticals.length - 2}
                    </span>
                  )}
                </div>

                {/* Target Roles */}
                <div
                  className="px-3 flex gap-1 overflow-hidden"
                  style={{ width: 140, minWidth: 140 }}
                >
                  {prospect.target_roles?.map((r) => (
                    <Badge key={r} variant="role" role={r} className="text-xs">
                      {r.slice(0, 3)}
                    </Badge>
                  ))}
                </div>

                {/* Score */}
                <div
                  className="px-3"
                  style={{ width: 80, minWidth: 80 }}
                >
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      getScoreColor(prospect.relevance_score),
                    )}
                  >
                    {prospect.relevance_score}
                  </span>
                </div>

                {/* Status */}
                <div
                  className="px-3"
                  style={{ width: 100, minWidth: 100 }}
                >
                  <Badge variant="status" status={prospect.status}>
                    {prospect.status}
                  </Badge>
                </div>

                {/* Location */}
                <div
                  className="px-3 text-sm text-text-secondary truncate"
                  style={{ width: 120, minWidth: 120 }}
                >
                  {prospect.location_city && prospect.location_state
                    ? `${prospect.location_city}, ${prospect.location_state}`
                    : prospect.location_city || '-'}
                </div>

                {/* Actions */}
                <div className="w-12 flex-shrink-0 px-3">
                  {prospect.linkedin_url && (
                    <a
                      href={prospect.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-text-muted hover:text-brand-blue transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ProspectContextMenu
            prospect={contextMenu.prospect}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onViewDetails={() => openDetailPanel(contextMenu.prospect.id)}
            onEnrich={() => onEnrich?.(contextMenu.prospect.id)}
            onExport={() => onExport?.(contextMenu.prospect.id)}
            onUpdateStatus={(status) =>
              onUpdateStatus?.(contextMenu.prospect.id, status)
            }
            onDelete={() => onDelete?.(contextMenu.prospect.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
