import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import MetricsCards from './MetricsCards'
import PipelineFunnel from './PipelineFunnel'
import VerticalBreakdown from './VerticalBreakdown'
import ActivityFeed from './ActivityFeed'
import GettingStarted from './GettingStarted'

export default function Dashboard() {
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: activityResponse, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.getActivity(20),
    refetchInterval: 30000,
  })

  const stats = statsResponse?.data
  const activity = activityResponse?.data

  // Show getting started if no prospects yet
  const showGettingStarted = stats && stats.total_prospects === 0

  return (
    <div className="space-y-6">
      {/* Getting Started (shown when empty) */}
      {showGettingStarted && <GettingStarted />}

      {/* Metrics Cards */}
      <MetricsCards stats={stats} loading={statsLoading} />

      {/* Pipeline & Vertical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineFunnel stats={stats} loading={statsLoading} />
        </div>
        <div>
          <VerticalBreakdown stats={stats} loading={statsLoading} />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed activity={activity} loading={activityLoading} />
    </div>
  )
}
