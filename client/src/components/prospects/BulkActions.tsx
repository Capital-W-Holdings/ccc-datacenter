import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2, Download, ChevronDown, Loader2, Mail, CalendarPlus } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAppStore } from '@/stores/app'
import { exportApi, hunterApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AddToEventModal from './AddToEventModal'

interface BulkActionsProps {
  selectedCount: number
  onStatusChange: (status: string) => void
  onDelete: () => void
  loading: boolean
}

const statusOptions = [
  { value: 'New', label: 'New' },
  { value: 'Qualified', label: 'Qualified' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Nurturing', label: 'Nurturing' },
  { value: 'Archived', label: 'Archived' },
]

export default function BulkActions({
  selectedCount,
  onStatusChange,
  onDelete,
  loading,
}: BulkActionsProps) {
  const { clearSelection, selectedProspectIds } = useAppStore()
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)
  const [findingEmails, setFindingEmails] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [addToEventOpen, setAddToEventOpen] = useState(false)

  const handleExport = async () => {
    try {
      setExporting(true)
      const result = await exportApi.create({
        format: 'csv',
        filters: { ids: Array.from(selectedProspectIds) },
        name: `Export - ${selectedCount} prospects`,
      })
      window.open(exportApi.download(result.data.export_id), '_blank')
      toast.success('Export started')
    } catch {
      toast.error('Failed to export')
    } finally {
      setExporting(false)
    }
  }

  const handleFindEmails = async () => {
    try {
      setFindingEmails(true)
      const result = await hunterApi.enrichProspects(Array.from(selectedProspectIds))
      const { processed, found, updated } = result.data

      if (updated > 0) {
        toast.success(`Found ${found} emails, updated ${updated} prospects`)
        queryClient.invalidateQueries({ queryKey: ['prospects'] })
      } else if (processed === 0) {
        toast.error('Selected prospects already have emails or missing required fields')
      } else {
        toast.error('No new emails found for selected prospects')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find emails'
      toast.error(message)
    } finally {
      setFindingEmails(false)
    }
  }

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      className="flex flex-wrap items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 mb-4 bg-brand-gold/10 border border-brand-gold/30 rounded-lg"
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary whitespace-nowrap">
          {selectedCount} selected
        </span>
        <button
          onClick={clearSelection}
          className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="hidden sm:block h-6 w-px bg-border" />

      {/* Status change - dropdown on mobile, buttons on desktop */}
      <div className="relative">
        {/* Mobile: Dropdown */}
        <div className="sm:hidden">
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-white border border-border hover:border-brand-gold transition-colors disabled:opacity-50"
          >
            Status
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {statusMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStatusMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-32">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onStatusChange(option.value)
                      setStatusMenuOpen(false)
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface-secondary transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop: Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-text-secondary">Status:</span>
          <div className="flex gap-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                disabled={loading}
                className="px-2 py-1 text-xs rounded bg-white border border-border hover:border-brand-gold hover:bg-brand-gold/5 transition-colors disabled:opacity-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden sm:block h-6 w-px bg-border" />

      {/* Add to Event */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setAddToEventOpen(true)}
        title="Add selected prospects to an event"
      >
        <CalendarPlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add to Event</span>
      </Button>

      {/* Find Emails (Hunter.io) */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleFindEmails}
        disabled={findingEmails}
        title="Look up emails via Hunter.io"
      >
        {findingEmails ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Mail className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Find Emails</span>
      </Button>

      {/* Export */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Export</span>
      </Button>

      {/* Delete */}
      <Button
        variant="danger"
        size="sm"
        onClick={onDelete}
        loading={loading}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Delete</span>
      </Button>

      {/* Add to Event Modal */}
      <AddToEventModal
        isOpen={addToEventOpen}
        onClose={() => setAddToEventOpen(false)}
        prospectIds={Array.from(selectedProspectIds)}
        onSuccess={() => {
          clearSelection()
          setAddToEventOpen(false)
        }}
      />
    </motion.div>
  )
}
