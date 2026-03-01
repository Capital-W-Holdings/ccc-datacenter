/**
 * Full page loading skeleton
 * Shows during route transitions and lazy loading
 */
export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-surface-secondary" />
          <div className="h-4 w-64 rounded bg-surface-secondary" />
        </div>
        <div className="h-10 w-32 rounded bg-surface-secondary" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-surface-secondary" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-border-primary bg-surface-primary">
        <div className="border-b border-border-primary p-4">
          <div className="h-10 w-full rounded bg-surface-secondary" />
        </div>
        <div className="divide-y divide-border-primary">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-surface-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-surface-secondary" />
                <div className="h-3 w-1/2 rounded bg-surface-secondary" />
              </div>
              <div className="h-6 w-16 rounded bg-surface-secondary" />
              <div className="h-8 w-8 rounded bg-surface-secondary" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 border-b border-border-primary py-3 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 flex-1 rounded bg-surface-secondary" />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-primary">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4 px-4">
            <div className="h-4 w-4 rounded bg-surface-secondary" />
            <div className="h-8 w-8 rounded-full bg-surface-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-surface-secondary" />
              <div className="h-3 w-1/4 rounded bg-surface-secondary" />
            </div>
            <div className="h-4 w-24 rounded bg-surface-secondary" />
            <div className="h-6 w-16 rounded-full bg-surface-secondary" />
            <div className="h-4 w-12 rounded bg-surface-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Card loading skeleton
 */
export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border-primary bg-surface-primary p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded bg-surface-secondary" />
          <div className="h-6 w-16 rounded-full bg-surface-secondary" />
        </div>
        <div className="h-4 w-full rounded bg-surface-secondary" />
        <div className="h-4 w-3/4 rounded bg-surface-secondary" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-20 rounded-full bg-surface-secondary" />
          <div className="h-6 w-24 rounded-full bg-surface-secondary" />
        </div>
      </div>
    </div>
  )
}

/**
 * Stats card skeleton
 */
export function StatsCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border-primary bg-surface-primary p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-surface-secondary" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-surface-secondary" />
          <div className="h-6 w-16 rounded bg-surface-secondary" />
        </div>
      </div>
    </div>
  )
}

export default LoadingSkeleton
