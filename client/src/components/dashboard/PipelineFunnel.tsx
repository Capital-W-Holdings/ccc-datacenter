import { ArrowRight, Loader2 } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import type { DashboardStats } from '@/types'
import { cn } from '@/lib/utils'

interface PipelineFunnelProps {
  stats: DashboardStats | undefined
  loading: boolean
}

const stages = [
  { key: 'scraped', label: 'Scraped', color: 'bg-slate-500' },
  { key: 'enriched', label: 'Enriched', color: 'bg-blue-500' },
  { key: 'categorized', label: 'Categorized', color: 'bg-purple-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-emerald-500' },
  { key: 'outreach_ready', label: 'Outreach Ready', color: 'bg-brand-gold' },
] as const

export default function PipelineFunnel({ stats, loading }: PipelineFunnelProps) {
  const getConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0
    return Math.round((current / previous) * 100)
  }

  const pipeline = stats?.pipeline
  const maxValue = pipeline
    ? Math.max(
        pipeline.scraped,
        pipeline.enriched,
        pipeline.categorized,
        pipeline.qualified,
        pipeline.outreach_ready,
      )
    : 0

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle className="heading-gold-accent">Pipeline Funnel</CardTitle>
      </CardHeader>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Funnel visualization */}
          <div className="flex items-center gap-2">
            {stages.map((stage, index) => {
              const value = pipeline?.[stage.key] ?? 0
              const prevValue =
                index > 0 ? pipeline?.[stages[index - 1].key] ?? 0 : value
              const conversionRate = getConversionRate(value, prevValue)
              const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0

              return (
                <div key={stage.key} className="flex-1 flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-secondary">
                        {stage.label}
                      </span>
                      {index > 0 && (
                        <span className="text-xs text-text-muted">
                          {conversionRate}%
                        </span>
                      )}
                    </div>
                    <div className="h-8 bg-surface-secondary rounded-lg overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-lg transition-all duration-500',
                          stage.color,
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="mt-1 text-center">
                      <span className="text-lg font-mono font-semibold text-text-primary">
                        {value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {index < stages.length - 1 && (
                    <ArrowRight className="w-4 h-4 mx-2 text-text-muted flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Status breakdown */}
          {stats?.by_status && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-text-secondary mb-3">
                By Status
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.by_status).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-lg"
                  >
                    <span className="text-sm text-text-primary">{status}</span>
                    <span className="text-sm font-mono font-semibold text-text-secondary">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
