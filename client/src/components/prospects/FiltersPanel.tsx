import { motion } from 'framer-motion'
import { X, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Slider from '@/components/ui/Slider'
import { useAppStore } from '@/stores/app'
import type { CCCVertical, TargetRole, CompanyType, ProspectStatus } from '@/types'

const verticals: CCCVertical[] = [
  'Development',
  'Investment',
  'Brokerage',
  'Management',
  'Construction',
]

const targetRoles: TargetRole[] = ['Attendee', 'Sponsor', 'Speaker']

const companyTypes: CompanyType[] = [
  'Hyperscaler',
  'Developer/Operator',
  'Investor',
  'Broker',
  'Contractor',
  'Engineering',
  'Consulting',
  'Legal',
  'Finance',
  'Other',
]

const statuses: ProspectStatus[] = [
  'New',
  'Qualified',
  'Contacted',
  'Engaged',
  'Nurturing',
  'Archived',
]

interface FiltersPanelProps {
  variant?: 'sidebar' | 'sheet'
  onApply?: () => void
}

export default function FiltersPanel({ variant = 'sidebar', onApply }: FiltersPanelProps) {
  const { filters, setFilters, resetFilters, closeFiltersPanel } = useAppStore()

  const toggleVertical = (vertical: CCCVertical) => {
    const current = filters.verticals
    if (current.includes(vertical)) {
      setFilters({ verticals: current.filter((v) => v !== vertical) })
    } else {
      setFilters({ verticals: [...current, vertical] })
    }
  }

  const toggleRole = (role: TargetRole) => {
    const current = filters.target_roles
    if (current.includes(role)) {
      setFilters({ target_roles: current.filter((r) => r !== role) })
    } else {
      setFilters({ target_roles: [...current, role] })
    }
  }

  const toggleCompanyType = (type: CompanyType) => {
    const current = filters.company_types
    if (current.includes(type)) {
      setFilters({ company_types: current.filter((t) => t !== type) })
    } else {
      setFilters({ company_types: [...current, type] })
    }
  }

  const toggleStatus = (status: ProspectStatus) => {
    const current = filters.statuses
    if (current.includes(status)) {
      setFilters({ statuses: current.filter((s) => s !== status) })
    } else {
      setFilters({ statuses: [...current, status] })
    }
  }

  // Use 2-column grid for sheet variant (better for mobile)
  const checkboxGridClass = variant === 'sheet' ? 'grid grid-cols-2 gap-2' : 'space-y-2'
  const roleGridClass = variant === 'sheet' ? 'grid grid-cols-3 gap-2' : 'space-y-2'

  // Filter content (shared between both variants)
  const filterContent = (
    <>
      {/* CCC Verticals */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3">
          CCC Verticals
        </h4>
        <div className={checkboxGridClass}>
          {verticals.map((vertical) => (
            <Checkbox
              key={vertical}
              label={vertical}
              checked={filters.verticals.includes(vertical)}
              onChange={() => toggleVertical(vertical)}
            />
          ))}
        </div>
      </div>

      {/* Target Roles */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Target Role
        </h4>
        <div className={roleGridClass}>
          {targetRoles.map((role) => (
            <Checkbox
              key={role}
              label={role}
              checked={filters.target_roles.includes(role)}
              onChange={() => toggleRole(role)}
            />
          ))}
        </div>
      </div>

      {/* Company Type */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Company Type
        </h4>
        <div className={checkboxGridClass}>
          {companyTypes.map((type) => (
            <Checkbox
              key={type}
              label={type}
              checked={filters.company_types.includes(type)}
              onChange={() => toggleCompanyType(type)}
            />
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-3">
          Status
        </h4>
        <div className={checkboxGridClass}>
          {statuses.map((status) => (
            <Checkbox
              key={status}
              label={status}
              checked={filters.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
            />
          ))}
        </div>
      </div>

      {/* Relevance Score Range */}
      <div>
        <Slider
          label="Relevance Score"
          min={0}
          max={100}
          value={[filters.score_min, filters.score_max]}
          onChange={([min, max]) =>
            setFilters({ score_min: min, score_max: max })
          }
        />
      </div>
    </>
  )

  // Sheet variant - no animation wrapper, shows in bottom sheet
  if (variant === 'sheet') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filterContent}
        </div>
        <div className="p-4 border-t border-border flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={resetFilters}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="gold" className="flex-1" onClick={onApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    )
  }

  // Sidebar variant - with animation and header
  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 bg-white border-r border-border flex flex-col flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">Filters</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={closeFiltersPanel}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filterContent}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="gold" className="w-full" onClick={closeFiltersPanel}>
          Apply Filters
        </Button>
      </div>
    </motion.div>
  )
}
