import { useState, useCallback } from 'react'
import { Filter, Download, Plus, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAppStore } from '@/stores/app'
import { debounce } from '@/lib/utils'
import AddProspectModal from './AddProspectModal'

interface ProspectsHeaderProps {
  total: number
  loading: boolean
}

export default function ProspectsHeader({ total, loading }: ProspectsHeaderProps) {
  const { filters, setFilters, openFiltersPanel, filtersPanelOpen } = useAppStore()
  const [showAddModal, setShowAddModal] = useState(false)

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters({ search: value })
    }, 300),
    [setFilters],
  )

  const hasActiveFilters =
    filters.verticals.length > 0 ||
    filters.target_roles.length > 0 ||
    filters.company_types.length > 0 ||
    filters.statuses.length > 0 ||
    filters.score_min > 0 ||
    filters.score_max < 100

  return (
    <div className="flex items-center justify-between mb-4 gap-4">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="w-80">
          <Input
            icon="search"
            placeholder="Search by name, company, title..."
            defaultValue={filters.search}
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>

        {/* Filter button */}
        <Button
          variant={filtersPanelOpen || hasActiveFilters ? 'gold' : 'secondary'}
          onClick={openFiltersPanel}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              Active
            </span>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {/* Results count */}
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="font-mono font-semibold text-text-primary">
              {total.toLocaleString()}
            </span>
          )}
          <span>prospects</span>
        </div>

        {/* Actions */}
        <Button variant="secondary">
          <Download className="w-4 h-4" />
          Export
        </Button>

        <Button variant="gold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Prospect
        </Button>
      </div>

      {/* Add Prospect Modal */}
      {showAddModal && (
        <AddProspectModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
