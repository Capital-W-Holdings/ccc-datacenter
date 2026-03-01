import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, User, Building2, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import { prospectsApi, eventsApi } from '@/lib/api'
import type { ProspectEventStatus } from '@/types'
import { cn } from '@/lib/utils'

interface AddProspectToEventModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventName: string
}

export default function AddProspectToEventModal({
  isOpen,
  onClose,
  eventId,
  eventName,
}: AddProspectToEventModalProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetRole, setTargetRole] = useState<'Attendee' | 'Sponsor' | 'Speaker'>('Attendee')
  const [initialStatus, setInitialStatus] = useState<ProspectEventStatus>('Identified')

  // Fetch prospects
  const { data: prospectsData, isLoading } = useQuery({
    queryKey: ['prospects-for-event', search],
    queryFn: () =>
      prospectsApi.list({
        page: 1,
        per_page: 50,
        filters: search ? { search } : undefined,
      }),
  })

  // Fetch existing event prospects to exclude them
  const { data: existingData } = useQuery({
    queryKey: ['event-prospects', eventId],
    queryFn: () => eventsApi.getProspects(eventId),
    enabled: isOpen,
  })

  const existingProspectIds = new Set(
    existingData?.data?.map((pe) => pe.prospect_id) ?? []
  )

  const availableProspects = (prospectsData?.data ?? []).filter(
    (p) => !existingProspectIds.has(p.id)
  )

  // Bulk add mutation
  const addMutation = useMutation({
    mutationFn: () =>
      eventsApi.bulkAddProspects(eventId, {
        prospect_ids: Array.from(selectedIds),
        target_role: targetRole,
        status: initialStatus,
      }),
    onSuccess: (data) => {
      toast.success(`Added ${data.data.added} prospects to event`)
      queryClient.invalidateQueries({ queryKey: ['event-prospects', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      onClose()
      setSelectedIds(new Set())
      setSearch('')
    },
    onError: () => {
      toast.error('Failed to add prospects')
    },
  })

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    setSelectedIds(new Set(availableProspects.map((p) => p.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one prospect')
      return
    }
    addMutation.mutate()
  }

  const getRoleBadgeColor = (roles: string[]) => {
    if (roles.includes('Sponsor')) return 'bg-emerald-50 text-emerald-700'
    if (roles.includes('Speaker')) return 'bg-purple-50 text-purple-700'
    if (roles.includes('Attendee')) return 'bg-blue-50 text-blue-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Prospects to ${eventName}`} size="lg">
      <div className="space-y-4">
        {/* Options */}
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search prospects by name, company, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-colors"
          />
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            {selectedIds.size} selected of {availableProspects.length} available
          </span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-brand-gold hover:underline"
              disabled={availableProspects.length === 0}
            >
              Select all
            </button>
            <span className="text-border">|</span>
            <button
              onClick={clearSelection}
              className="text-text-muted hover:text-text-primary"
              disabled={selectedIds.size === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Prospect list */}
        <div className="h-80 overflow-y-auto border border-border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
            </div>
          ) : availableProspects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <User className="w-8 h-8 mb-2" />
              <p>No prospects available</p>
              <p className="text-xs">All prospects may already be added to this event</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {availableProspects.map((prospect) => (
                <button
                  key={prospect.id}
                  onClick={() => toggleSelect(prospect.id)}
                  className={cn(
                    'w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-surface-secondary transition-colors',
                    selectedIds.has(prospect.id) && 'bg-brand-gold/5'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      selectedIds.has(prospect.id)
                        ? 'bg-brand-gold border-brand-gold'
                        : 'border-border'
                    )}
                  >
                    {selectedIds.has(prospect.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-brand-gold" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {prospect.full_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {prospect.title && (
                        <span className="truncate max-w-[150px]">{prospect.title}</span>
                      )}
                      {prospect.company && (
                        <>
                          {prospect.title && <span>•</span>}
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {prospect.company}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Target roles */}
                  <div className="flex gap-1">
                    {prospect.target_roles.slice(0, 2).map((role) => (
                      <Badge
                        key={role}
                        className={cn('text-[10px]', getRoleBadgeColor([role]))}
                      >
                        {role.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
            loading={addMutation.isPending}
          >
            Add {selectedIds.size} Prospect{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
