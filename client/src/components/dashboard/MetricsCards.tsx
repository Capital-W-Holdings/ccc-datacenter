import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, Megaphone, Mic2, Sparkles, Download, ArrowRight, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import { StatsCardSkeleton } from '@/components/common/LoadingSkeleton'
import type { DashboardStats, TargetRole } from '@/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

interface MetricsCardsProps {
  stats: DashboardStats | undefined
  loading: boolean
}

interface MetricConfig {
  label: string
  value: number
  icon: typeof Users
  color: string
  bgColor: string
  hoverBgColor: string
  borderColor: string
  description: string
  subtext: string
  route: string
  filterAction?: () => void
}

export default function MetricsCards({ stats, loading }: MetricsCardsProps) {
  const navigate = useNavigate()
  const { setFilters, resetFilters } = useAppStore()

  const totalProspects = stats?.total_prospects ?? 0
  const attendees = stats?.by_target_role.attendees ?? 0
  const sponsors = stats?.by_target_role.sponsors ?? 0
  const speakers = stats?.by_target_role.speakers ?? 0
  const enrichmentQueue = stats?.enrichment_queue ?? 0
  const exportReady = stats?.export_ready ?? 0

  // Calculate percentages for subtexts
  const attendeePercent = totalProspects > 0 ? Math.round((attendees / totalProspects) * 100) : 0
  const sponsorPercent = totalProspects > 0 ? Math.round((sponsors / totalProspects) * 100) : 0
  const speakerPercent = totalProspects > 0 ? Math.round((speakers / totalProspects) * 100) : 0
  const qualifiedCount = stats?.pipeline.qualified ?? 0
  const outreachReady = stats?.pipeline.outreach_ready ?? 0

  const handleNavigate = (metric: MetricConfig) => {
    if (metric.filterAction) {
      metric.filterAction()
    }
    navigate(metric.route)
  }

  const metrics: MetricConfig[] = [
    {
      label: 'Total Prospects',
      value: totalProspects,
      icon: Users,
      color: 'text-brand-gold',
      bgColor: 'bg-brand-gold/10',
      hoverBgColor: 'hover:bg-brand-gold/5',
      borderColor: 'hover:border-brand-gold/30',
      description: 'All prospects in pipeline',
      subtext: `${qualifiedCount} qualified • ${outreachReady} outreach ready`,
      route: '/prospects',
      filterAction: () => resetFilters(),
    },
    {
      label: 'Potential Attendees',
      value: attendees,
      icon: UserCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverBgColor: 'hover:bg-blue-50/50',
      borderColor: 'hover:border-blue-200',
      description: 'Conference attendee targets',
      subtext: `${attendeePercent}% of total pipeline`,
      route: '/prospects',
      filterAction: () => {
        resetFilters()
        setFilters({ target_roles: ['Attendee' as TargetRole] })
      },
    },
    {
      label: 'Potential Sponsors',
      value: sponsors,
      icon: Megaphone,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      hoverBgColor: 'hover:bg-emerald-50/50',
      borderColor: 'hover:border-emerald-200',
      description: 'Sponsor & exhibitor targets',
      subtext: `${sponsorPercent}% of total pipeline`,
      route: '/prospects',
      filterAction: () => {
        resetFilters()
        setFilters({ target_roles: ['Sponsor' as TargetRole] })
      },
    },
    {
      label: 'Potential Speakers',
      value: speakers,
      icon: Mic2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverBgColor: 'hover:bg-purple-50/50',
      borderColor: 'hover:border-purple-200',
      description: 'Speaker & panelist targets',
      subtext: `${speakerPercent}% of total pipeline`,
      route: '/prospects',
      filterAction: () => {
        resetFilters()
        setFilters({ target_roles: ['Speaker' as TargetRole] })
      },
    },
    {
      label: 'Enrichment Queue',
      value: enrichmentQueue,
      icon: Sparkles,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      hoverBgColor: 'hover:bg-amber-50/50',
      borderColor: 'hover:border-amber-200',
      description: 'Pending AI enrichment',
      subtext: enrichmentQueue > 0 ? 'Ready to process' : 'All caught up!',
      route: '/enrichment',
    },
    {
      label: 'Export Ready',
      value: exportReady,
      icon: Download,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      hoverBgColor: 'hover:bg-cyan-50/50',
      borderColor: 'hover:border-cyan-200',
      description: 'Qualified for outreach',
      subtext: exportReady > 0 ? 'Ready to download' : 'Qualify prospects first',
      route: '/export',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <button
          key={metric.label}
          onClick={() => handleNavigate(metric)}
          className="text-left w-full group"
        >
          <Card
            padding="md"
            hover
            className={cn(
              'h-full transition-all duration-200 cursor-pointer border-2 border-transparent',
              metric.hoverBgColor,
              metric.borderColor
            )}
          >
            <div className="flex flex-col h-full">
              {/* Header with icon */}
              <div className="flex items-start justify-between mb-2">
                <div className={cn('p-2 rounded-lg', metric.bgColor)}>
                  <metric.icon className={cn('w-5 h-5', metric.color)} />
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-200" />
              </div>

              {/* Value */}
              <p className="metric-number text-text-primary mb-1">
                {metric.value.toLocaleString()}
              </p>

              {/* Label */}
              <p className="text-sm font-medium text-text-primary mb-1">
                {metric.label}
              </p>

              {/* Description */}
              <p className="text-xs text-text-muted mb-2">
                {metric.description}
              </p>

              {/* Subtext with icon */}
              <div className="mt-auto pt-2 border-t border-border-light">
                <div className="flex items-center gap-1.5">
                  {metric.label === 'Enrichment Queue' ? (
                    metric.value > 0 ? (
                      <Clock className="w-3 h-3 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    )
                  ) : metric.label === 'Export Ready' ? (
                    metric.value > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-text-muted" />
                    )
                  ) : (
                    <TrendingUp className="w-3 h-3 text-text-muted" />
                  )}
                  <span className="text-xs text-text-muted truncate">
                    {metric.subtext}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </button>
      ))}
    </div>
  )
}
