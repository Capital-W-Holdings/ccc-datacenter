import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plus,
  GripVertical,
  Building2,
  Trash2,
  Loader2,
  Settings,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { eventsApi } from '@/lib/api'
import type { ProspectEvent, ProspectEventStatus } from '@/types'
import { cn } from '@/lib/utils'
import AddProspectToEventModal from './AddProspectToEventModal'
import ProspectQuickViewModal from '@/components/prospects/ProspectQuickViewModal'

const PIPELINE_STAGES: { status: ProspectEventStatus; label: string; color: string }[] = [
  { status: 'Identified', label: 'Identified', color: 'bg-gray-100 border-gray-300' },
  { status: 'Invited', label: 'Invited', color: 'bg-blue-50 border-blue-300' },
  { status: 'Registered', label: 'Registered', color: 'bg-purple-50 border-purple-300' },
  { status: 'Confirmed', label: 'Confirmed', color: 'bg-emerald-50 border-emerald-300' },
  { status: 'Attended', label: 'Attended', color: 'bg-brand-gold/10 border-brand-gold' },
]

const NEGATIVE_STAGES: ProspectEventStatus[] = ['No Show', 'Declined']

export default function EventPipelinePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [draggedItem, setDraggedItem] = useState<ProspectEvent | null>(null)
  const [quickViewProspectId, setQuickViewProspectId] = useState<string | null>(null)

  // Fetch event details
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: !!eventId,
  })

  // Fetch prospects for this event
  const { data: prospectsData } = useQuery({
    queryKey: ['event-prospects', eventId],
    queryFn: () => eventsApi.getProspects(eventId!),
    enabled: !!eventId,
  })

  const event = eventData?.data
  const prospects = prospectsData?.data ?? []

  // Update prospect status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      prospectEventId,
      status,
    }: {
      prospectEventId: string
      status: ProspectEventStatus
    }) => eventsApi.updateProspectStatus(eventId!, prospectEventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-prospects', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] }) // Update event counts
      queryClient.invalidateQueries({ queryKey: ['event', eventId] }) // Update single event
      toast.success('Status updated')
    },
    onError: () => {
      toast.error('Failed to update status')
    },
  })

  // Remove prospect mutation
  const removeMutation = useMutation({
    mutationFn: (prospectEventId: string) =>
      eventsApi.removeProspect(eventId!, prospectEventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-prospects', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] }) // Update event counts
      queryClient.invalidateQueries({ queryKey: ['event', eventId] }) // Update single event
      toast.success('Prospect removed from event')
    },
    onError: () => {
      toast.error('Failed to remove prospect')
    },
  })

  // Group prospects by status
  const getProspectsByStatus = (status: ProspectEventStatus) =>
    prospects.filter((p) => p.status === status)

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, prospect: ProspectEvent) => {
    setDraggedItem(prospect)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: ProspectEventStatus) => {
    e.preventDefault()
    if (draggedItem && draggedItem.status !== newStatus) {
      updateStatusMutation.mutate({
        prospectEventId: draggedItem.id,
        status: newStatus,
      })
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Attendee':
        return 'bg-blue-50 text-blue-700'
      case 'Sponsor':
        return 'bg-emerald-50 text-emerald-700'
      case 'Speaker':
        return 'bg-purple-50 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (eventLoading || !event) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
      </div>
    )
  }

  const totalCount = prospects.length
  const confirmedCount = prospects.filter(
    (p) => p.status === 'Confirmed' || p.status === 'Attended'
  ).length

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{event.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.location_city}, {event.location_state}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(event.date), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {totalCount} prospects • {confirmedCount} confirmed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Prospects
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageProspects = getProspectsByStatus(stage.status)
            return (
              <div
                key={stage.status}
                className="w-72 flex-shrink-0 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.status)}
              >
                {/* Column header */}
                <div
                  className={cn(
                    'px-3 py-2 rounded-t-lg border-t-2 bg-white',
                    stage.color
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-text-primary">{stage.label}</h3>
                    <Badge className="text-xs bg-white">
                      {stageProspects.length}
                    </Badge>
                  </div>
                </div>

                {/* Column content */}
                <div className="flex-1 bg-surface-secondary rounded-b-lg p-2 space-y-2 overflow-y-auto">
                  {stageProspects.length === 0 ? (
                    <div className="text-center py-8 text-sm text-text-muted">
                      No prospects
                    </div>
                  ) : (
                    stageProspects.map((pe) => (
                      <div
                        key={pe.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pe)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'bg-white rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow',
                          draggedItem?.id === pe.id && 'opacity-50'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (pe.prospect_id) {
                                setQuickViewProspectId(pe.prospect_id)
                              }
                            }}
                            className="flex-1 min-w-0 text-left hover:bg-surface-secondary rounded p-1 -m-1 transition-colors"
                          >
                            <p className="font-medium text-text-primary truncate hover:text-brand-gold transition-colors">
                              {pe.prospect?.full_name || 'Unknown'}
                            </p>
                            {pe.prospect?.title && (
                              <p className="text-xs text-text-muted truncate">
                                {pe.prospect.title}
                              </p>
                            )}
                            {pe.prospect?.company && (
                              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3" />
                                <span className="truncate">{pe.prospect.company}</span>
                              </p>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <Badge className={cn('text-xs', getRoleBadgeColor(pe.target_role))}>
                            {pe.target_role}
                          </Badge>
                          <button
                            onClick={() => {
                              if (confirm('Remove this prospect from the event?')) {
                                removeMutation.mutate(pe.id)
                              }
                            }}
                            className="p-1 rounded text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Negative outcomes column */}
          <div className="w-72 flex-shrink-0 flex flex-col opacity-75">
            <div className="px-3 py-2 rounded-t-lg border-t-2 bg-white bg-red-50 border-red-300">
              <h3 className="font-medium text-text-primary">Not Attending</h3>
            </div>
            <div className="flex-1 bg-surface-secondary rounded-b-lg p-2 space-y-2 overflow-y-auto">
              {NEGATIVE_STAGES.map((status) => {
                const stageProspects = getProspectsByStatus(status)
                return stageProspects.map((pe) => (
                  <button
                    key={pe.id}
                    onClick={() => {
                      if (pe.prospect_id) {
                        setQuickViewProspectId(pe.prospect_id)
                      }
                    }}
                    className="w-full bg-white rounded-lg border border-border p-3 shadow-sm text-left hover:shadow-md hover:border-brand-gold/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate hover:text-brand-gold transition-colors">
                          {pe.prospect?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-text-muted">{pe.status}</p>
                      </div>
                      <Badge className={cn('text-[10px]', getRoleBadgeColor(pe.target_role))}>
                        {pe.target_role.slice(0, 3)}
                      </Badge>
                    </div>
                  </button>
                ))
              })}
              {prospects.filter((p) => NEGATIVE_STAGES.includes(p.status)).length === 0 && (
                <div className="text-center py-8 text-sm text-text-muted">
                  None
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Prospect Modal */}
      <AddProspectToEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        eventId={eventId!}
        eventName={event.name}
      />

      {/* Prospect Quick View Modal */}
      <ProspectQuickViewModal
        isOpen={!!quickViewProspectId}
        onClose={() => setQuickViewProspectId(null)}
        prospectId={quickViewProspectId}
      />
    </div>
  )
}
