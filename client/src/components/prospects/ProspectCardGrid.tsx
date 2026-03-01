import { AnimatePresence } from 'framer-motion'
import ProspectCard from './ProspectCard'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import EmptyState from '@/components/common/EmptyState'
import type { Prospect } from '@/types'

interface ProspectCardGridProps {
  prospects: Prospect[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onDeselect: (id: string) => void
  onOpenDetail: (id: string) => void
  onEnrich?: (id: string) => void
  onDelete?: (id: string) => void
  loading?: boolean
}

export default function ProspectCardGrid({
  prospects,
  selectedIds,
  onSelect,
  onDeselect,
  onOpenDetail,
  onEnrich,
  onDelete,
  loading,
}: ProspectCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (prospects.length === 0) {
    return <EmptyState type="no-results" />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pb-24">
      <AnimatePresence mode="popLayout">
        {prospects.map((prospect) => (
          <ProspectCard
            key={prospect.id}
            prospect={prospect}
            isSelected={selectedIds.has(prospect.id)}
            onSelect={() => onSelect(prospect.id)}
            onDeselect={() => onDeselect(prospect.id)}
            onClick={() => onOpenDetail(prospect.id)}
            onEnrich={() => onEnrich?.(prospect.id)}
            onDelete={() => onDelete?.(prospect.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
