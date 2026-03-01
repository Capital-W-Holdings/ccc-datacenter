import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { eventsApi } from '@/lib/api'
import type { EventStatus } from '@/types'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    location_city: '',
    location_state: '',
    venue: '',
    date: '',
    end_date: '',
    description: '',
    expected_attendees: '',
    website_url: '',
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      return eventsApi.create({
        name: formData.name,
        slug,
        location_city: formData.location_city,
        location_state: formData.location_state,
        venue: formData.venue || null,
        date: formData.date,
        end_date: formData.end_date || null,
        description: formData.description || null,
        status: 'upcoming' as EventStatus,
        expected_attendees: formData.expected_attendees
          ? parseInt(formData.expected_attendees)
          : null,
        website_url: formData.website_url || null,
      })
    },
    onSuccess: () => {
      toast.success('Event created successfully')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      onClose()
      setFormData({
        name: '',
        location_city: '',
        location_state: '',
        venue: '',
        date: '',
        end_date: '',
        description: '',
        expected_attendees: '',
        website_url: '',
      })
    },
    onError: () => {
      toast.error('Failed to create event')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.location_city || !formData.location_state || !formData.date) {
      toast.error('Please fill in required fields')
      return
    }
    createMutation.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Event" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Name */}
        <Input
          label="Event Name *"
          placeholder="e.g., CCC Boston Data Center Summit"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City *"
            placeholder="e.g., Boston"
            value={formData.location_city}
            onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
            required
          />
          <Select
            label="State *"
            value={formData.location_state}
            onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
            options={US_STATES.map((state) => ({ value: state, label: state }))}
            placeholder="Select state"
          />
        </div>

        {/* Venue */}
        <Input
          label="Venue"
          placeholder="e.g., Boston Convention Center"
          value={formData.venue}
          onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>

        {/* Expected Attendees */}
        <Input
          label="Expected Attendees"
          type="number"
          placeholder="e.g., 500"
          value={formData.expected_attendees}
          onChange={(e) => setFormData({ ...formData, expected_attendees: e.target.value })}
        />

        {/* Website URL */}
        <Input
          label="Website URL"
          type="url"
          placeholder="https://..."
          value={formData.website_url}
          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-colors resize-none"
            rows={3}
            placeholder="Brief description of the event..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Create Event
          </Button>
        </div>
      </form>
    </Modal>
  )
}
