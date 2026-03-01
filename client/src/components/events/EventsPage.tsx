import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { format, isToday } from 'date-fns'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { eventsApi } from '@/lib/api'
import type { Event, EventStatus } from '@/types'
import { cn } from '@/lib/utils'
import CreateEventModal from './CreateEventModal'

const statusConfig: Record<EventStatus, { label: string; color: string; icon: typeof Clock }> = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-50 text-blue-700', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600', icon: XCircle },
}

export default function EventsPage() {
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', filterStatus],
    queryFn: () => eventsApi.list(filterStatus === 'all' ? undefined : { status: filterStatus }),
  })

  const events = eventsData?.data ?? []

  // Group events by status
  const upcomingEvents = events.filter((e) => e.status === 'upcoming')
  const activeEvents = events.filter((e) => e.status === 'active')
  const pastEvents = events.filter((e) => e.status === 'completed' || e.status === 'cancelled')

  const getEventDateDisplay = (event: Event) => {
    const date = new Date(event.date)
    if (isToday(date)) return 'Today'
    return format(date, 'MMM d, yyyy')
  }

  const EventCard = ({ event }: { event: Event }) => {
    const config = statusConfig[event.status]
    const StatusIcon = config.icon

    return (
      <Card
        hover
        className="cursor-pointer group"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary group-hover:text-brand-gold transition-colors truncate">
              {event.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {event.location_city}, {event.location_state}
              </span>
            </div>
          </div>
          <Badge className={cn('flex items-center gap-1', config.color)}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Calendar className="w-4 h-4 text-text-muted" />
            <span>{getEventDateDisplay(event)}</span>
          </div>
          {event.prospect_count !== undefined && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Users className="w-4 h-4 text-text-muted" />
              <span>{event.prospect_count} prospects</span>
            </div>
          )}
        </div>

        {/* Progress bar for upcoming/active events */}
        {(event.status === 'upcoming' || event.status === 'active') &&
          event.registered_count !== undefined &&
          event.expected_attendees && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>
                  {event.registered_count} / {event.expected_attendees} registered
                </span>
                <span>
                  {Math.round((event.registered_count / event.expected_attendees) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-gold rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (event.registered_count / event.expected_attendees) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {event.venue || 'Venue TBD'}
          </span>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Events</h1>
          <p className="text-text-muted">
            Manage CCC events and track prospect pipelines
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(['all', 'upcoming', 'active', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filterStatus === status
                ? 'bg-brand-gold/10 text-brand-gold'
                : 'text-text-secondary hover:bg-surface-secondary'
            )}
          >
            {status === 'all' ? 'All Events' : statusConfig[status].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text-primary mb-1">No events yet</h3>
          <p className="text-text-muted mb-4">
            Create your first event to start building pipelines
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Events */}
          {activeEvents.length > 0 && (filterStatus === 'all' || filterStatus === 'active') && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Active Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (filterStatus === 'all' || filterStatus === 'upcoming') && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Upcoming Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (filterStatus === 'all' || filterStatus === 'completed') && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Past Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
