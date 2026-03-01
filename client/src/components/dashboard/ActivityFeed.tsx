import {
  Search,
  Sparkles,
  Download,
  UserPlus,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import type { ActivityLog } from '@/types'
import { formatRelativeTime, cn } from '@/lib/utils'

interface ActivityFeedProps {
  activity: ActivityLog[] | undefined
  loading: boolean
}

const activityIcons: Record<string, { icon: typeof Search; color: string }> = {
  scrape_started: { icon: Search, color: 'text-blue-500 bg-blue-50' },
  scrape_completed: { icon: Search, color: 'text-emerald-500 bg-emerald-50' },
  enrichment_run: { icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
  export: { icon: Download, color: 'text-cyan-500 bg-cyan-50' },
  status_change: { icon: RefreshCw, color: 'text-amber-500 bg-amber-50' },
  prospect_added: { icon: UserPlus, color: 'text-brand-gold bg-brand-gold/10' },
}

function getActivityMessage(activity: ActivityLog): string {
  const details = activity.details as Record<string, unknown>

  switch (activity.action) {
    case 'scrape_started':
      return `Started scraping "${details.scraper_name || 'Unknown'}"`
    case 'scrape_completed':
      return `Completed scrape: ${details.count || 0} prospects found`
    case 'enrichment_run':
      return `Enriched ${details.count || 0} prospects`
    case 'export':
      return `Exported ${details.count || 0} prospects to ${details.format || 'file'}`
    case 'status_change':
      return `Changed status of ${details.count || 1} prospect(s) to "${details.new_status || 'Unknown'}"`
    case 'prospect_added':
      return `Added ${details.count || 1} new prospect(s)`
    default:
      return 'Activity recorded'
  }
}

export default function ActivityFeed({ activity, loading }: ActivityFeedProps) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle className="heading-gold-accent">Recent Activity</CardTitle>
      </CardHeader>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
        </div>
      ) : !activity || activity.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-muted">No activity yet</p>
          <p className="text-sm text-text-muted mt-1">
            Start by running a scraper to see activity here
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activity.map((item) => {
            const { icon: Icon, color } = activityIcons[item.action] || {
              icon: RefreshCw,
              color: 'text-gray-500 bg-gray-50',
            }

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                <div className={cn('p-2 rounded-lg flex-shrink-0', color.split(' ')[1])}>
                  <Icon className={cn('w-4 h-4', color.split(' ')[0])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    {getActivityMessage(item)}
                  </p>
                  <p className="text-xs text-brand-gold mt-0.5">
                    {formatRelativeTime(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
