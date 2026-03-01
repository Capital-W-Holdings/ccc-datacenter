import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Calendar, MapPin, Loader2, Users } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { eventsApi } from '@/lib/api'
import type { Event, ProspectEventStatus } from '@/types'
import { cn } from '@/lib/utils'

interface AddToEventModalProps {
  isOpen: boolean
  onClose: () => void
  prospectIds: string[]
  onSuccess: () => void
}

export default function AddToEventModal({
  isOpen,
  onClose,
  prospectIds,
  onSuccess,
}: AddToEventModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [targetRole, setTargetRole] = useState<'Attendee' | 'Sponsor' | 'Speaker'>('Attendee')
  const [initialStatus, setInitialStatus] = useState<ProspectEventStatus>('Identified')

  // Fetch upcoming/active events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events-for-add'],
    queryFn: () => eventsApi.list(),
    enabled: isOpen,
  })

  // Filter to only show upcoming and active events
  const availableEvents = (eventsData?.data ?? []).filter(
    (e: Event) => e.status === 'upcoming' || e.status === 'active'
  )

  // Bulk add mutation
  const addMutation = useMutation({
    mutationFn: () => {
      if (!selectedEventId) throw new Error('No event selected')
      return eventsApi.bulkAddProspects(selectedEventId, {
        prospect_ids: prospectIds,
        target_role: targetRole,
        status: initialStatus,
      })
    },
    onSuccess: (data) => {
      const added = data.data.added
      if (added > 0) {
        toast.success(`Added ${added} prospect${added !== 1 ? 's' : ''} to event`)
        onSuccess()
      } else {
        toast.error('All selected prospects are already in this event')
      }
    },
    onError: () => {
      toast.error('Failed to add prospects to event')
    },
  })

  const handleSubmit = () => {
    if (!selectedEventId) {
      toast.error('Please select an event')
      return
    }
    addMutation.mutate()
  }

  const selectedEvent = availableEvents.find((e: Event) => e.id === selectedEventId)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Event" size="md">
      <div className="space-y-4">
        {/* Prospect count */}
        <div className="flex items-center gap-2 p-3 bg-brand-gold/10 rounded-lg">
          <Users className="w-5 h-5 text-brand-gold" />
          <span className="text-sm font-medium">
            {prospectIds.length} prospect{prospectIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Event selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Select Event *
          </label>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
            </div>
          ) : availableEvents.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <p>No upcoming events available</p>
              <p className="text-xs">Create an event first</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableEvents.map((event: Event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedEventId === event.id
                      ? 'border-brand-gold bg-brand-gold/5'
                      : 'border-border hover:border-brand-gold/50'
                  )}
                >
                  <div className="font-medium text-text-primary">{event.name}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location_city}, {event.location_state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(event.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        {selectedEvent && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-surface-secondary rounded-lg">
            <Select
              label="Target Role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as typeof targetRole)}
              options={[
                { value: 'Attendee', label: 'Attendee' },
                { value: 'Sponsor', label: 'Sponsor' },
                { value: 'Speaker', label: 'Speaker' },
              ]}
            />
            <Select
              label="Initial Status"
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as ProspectEventStatus)}
              options={[
                { value: 'Identified', label: 'Identified' },
                { value: 'Invited', label: 'Invited' },
                { value: 'Registered', label: 'Registered' },
              ]}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEventId || availableEvents.length === 0}
            loading={addMutation.isPending}
          >
            Add to Event
          </Button>
        </div>
      </div>
    </Modal>
  )
}
