import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import EmptyState from '@/components/common/EmptyState'
import type { Prospect } from '@/types'

interface EnrichmentQueueProps {
  prospects: Prospect[]
  loading: boolean
}

export default function EnrichmentQueue({
  prospects,
  loading,
}: EnrichmentQueueProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (prospects.length === 0) {
    return <EmptyState type="empty-queue" className="h-64" />
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {prospects.slice(0, 20).map((prospect, index) => (
        <div
          key={prospect.id}
          className="flex items-center gap-4 p-3 bg-surface-secondary rounded-lg"
        >
          <span className="w-6 h-6 rounded-full bg-surface-tertiary flex items-center justify-center text-xs font-mono text-text-muted">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">
              {prospect.full_name}
            </p>
            <p className="text-sm text-text-muted truncate">
              {prospect.title || 'No title'} at {prospect.company || 'Unknown company'}
            </p>
          </div>
          <div className="text-sm text-text-muted">
            {prospect.relevance_score > 0 ? (
              <span className="font-mono">Score: {prospect.relevance_score}</span>
            ) : (
              <span className="text-amber-600">Needs enrichment</span>
            )}
          </div>
        </div>
      ))}
      {prospects.length > 20 && (
        <p className="text-sm text-text-muted text-center py-2">
          +{prospects.length - 20} more in queue
        </p>
      )}
    </div>
  )
}
