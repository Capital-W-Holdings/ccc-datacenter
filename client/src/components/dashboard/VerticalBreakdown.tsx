import { Loader2 } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import type { DashboardStats, CCCVertical } from '@/types'
import { cn } from '@/lib/utils'

interface VerticalBreakdownProps {
  stats: DashboardStats | undefined
  loading: boolean
}

const verticals: { key: keyof DashboardStats['by_vertical']; label: CCCVertical; color: string }[] = [
  { key: 'development', label: 'Development', color: 'bg-indigo-500' },
  { key: 'investment', label: 'Investment', color: 'bg-emerald-500' },
  { key: 'brokerage', label: 'Brokerage', color: 'bg-orange-500' },
  { key: 'management', label: 'Management', color: 'bg-sky-500' },
  { key: 'construction', label: 'Construction', color: 'bg-slate-500' },
]

export default function VerticalBreakdown({ stats, loading }: VerticalBreakdownProps) {
  const byVertical = stats?.by_vertical
  const total = byVertical
    ? Object.values(byVertical).reduce((sum, val) => sum + val, 0)
    : 0

  return (
    <Card padding="lg" className="h-full">
      <CardHeader>
        <CardTitle className="heading-gold-accent">CCC Verticals</CardTitle>
      </CardHeader>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="space-y-4">
          {verticals.map((vertical) => {
            const count = byVertical?.[vertical.key] ?? 0
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0

            return (
              <div key={vertical.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    {vertical.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-text-secondary">
                      {count.toLocaleString()}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      vertical.color,
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}

          {/* Total */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">
                Total Assignments
              </span>
              <span className="text-lg font-mono font-semibold text-text-primary">
                {total.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Note: Prospects can belong to multiple verticals
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
