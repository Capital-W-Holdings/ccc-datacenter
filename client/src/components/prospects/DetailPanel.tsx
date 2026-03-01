import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  X,
  Globe,
  Mail,
  MapPin,
  Sparkles,
  Save,
  Building2,
  User,
  Briefcase,
  ExternalLink,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import type { Prospect, CompanyType, CCCVertical, TargetRole } from '@/types'
import { prospectsApi } from '@/lib/api'
import { cn, getScoreColor, getScoreBgColor, formatDate } from '@/lib/utils'

interface DetailPanelProps {
  prospect: Prospect
  onClose: () => void
}

const statusOptions = [
  { value: 'New', label: 'New' },
  { value: 'Qualified', label: 'Qualified' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Nurturing', label: 'Nurturing' },
  { value: 'Archived', label: 'Archived' },
]

const companyTypeOptions = [
  { value: '', label: 'Not specified' },
  { value: 'Hyperscaler', label: 'Hyperscaler' },
  { value: 'Developer/Operator', label: 'Developer/Operator' },
  { value: 'Investor', label: 'Investor' },
  { value: 'Broker', label: 'Broker' },
  { value: 'Contractor', label: 'Contractor' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Other', label: 'Other' },
]

const verticalOptions: CCCVertical[] = ['Development', 'Investment', 'Brokerage', 'Management', 'Construction']
const roleOptions: TargetRole[] = ['Attendee', 'Sponsor', 'Speaker']

export default function DetailPanel({ prospect, onClose }: DetailPanelProps) {
  const queryClient = useQueryClient()

  // Editable fields state
  const [formData, setFormData] = useState({
    first_name: prospect.first_name || '',
    last_name: prospect.last_name || '',
    title: prospect.title || '',
    company: prospect.company || '',
    company_type: prospect.company_type || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    linkedin_url: prospect.linkedin_url || '',
    website: prospect.website || '',
    location_city: prospect.location_city || '',
    location_state: prospect.location_state || '',
    location_country: prospect.location_country || 'US',
    ccc_verticals: prospect.ccc_verticals || [],
    target_roles: prospect.target_roles || [],
    status: prospect.status,
    notes: prospect.notes || '',
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Prospect>) =>
      prospectsApi.update(prospect.id, data),
    onSuccess: () => {
      toast.success('Prospect updated')
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['prospect', prospect.id] })
    },
    onError: () => {
      toast.error('Failed to update prospect')
    },
  })

  const handleSave = () => {
    const updateData: Partial<Prospect> = {
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      full_name: `${formData.first_name} ${formData.last_name}`.trim(),
      title: formData.title || null,
      company: formData.company || null,
      company_type: (formData.company_type || null) as CompanyType | null,
      email: formData.email || null,
      phone: formData.phone || null,
      linkedin_url: formData.linkedin_url || null,
      website: formData.website || null,
      location_city: formData.location_city || null,
      location_state: formData.location_state || null,
      location_country: formData.location_country || 'US',
      ccc_verticals: formData.ccc_verticals,
      target_roles: formData.target_roles,
      status: formData.status,
      notes: formData.notes || null,
    }
    updateMutation.mutate(updateData)
  }

  const handleFieldChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleVertical = (vertical: CCCVertical) => {
    setFormData(prev => ({
      ...prev,
      ccc_verticals: prev.ccc_verticals.includes(vertical)
        ? prev.ccc_verticals.filter(v => v !== vertical)
        : [...prev.ccc_verticals, vertical]
    }))
  }

  const toggleRole = (role: TargetRole) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }))
  }

  // Check if anything changed
  const hasChanges =
    formData.first_name !== (prospect.first_name || '') ||
    formData.last_name !== (prospect.last_name || '') ||
    formData.title !== (prospect.title || '') ||
    formData.company !== (prospect.company || '') ||
    formData.company_type !== (prospect.company_type || '') ||
    formData.email !== (prospect.email || '') ||
    formData.phone !== (prospect.phone || '') ||
    formData.linkedin_url !== (prospect.linkedin_url || '') ||
    formData.website !== (prospect.website || '') ||
    formData.location_city !== (prospect.location_city || '') ||
    formData.location_state !== (prospect.location_state || '') ||
    formData.location_country !== (prospect.location_country || 'US') ||
    JSON.stringify(formData.ccc_verticals) !== JSON.stringify(prospect.ccc_verticals || []) ||
    JSON.stringify(formData.target_roles) !== JSON.stringify(prospect.target_roles || []) ||
    formData.status !== prospect.status ||
    formData.notes !== (prospect.notes || '')

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
  const labelClass = "block text-xs font-medium text-text-muted mb-1"

  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'bg-white border-l border-border flex flex-col flex-shrink-0',
          'fixed inset-0 z-50',
          'lg:relative lg:w-[420px] lg:z-auto',
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-text-primary">
                {prospect.full_name}
              </h2>
              <p className="text-sm text-text-muted">Edit prospect details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
              aria-label="Close detail panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Score badge (read-only) */}
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg',
              getScoreBgColor(prospect.relevance_score),
            )}
          >
            <Sparkles className={cn('w-4 h-4', getScoreColor(prospect.relevance_score))} />
            <span className={cn('font-mono font-semibold', getScoreColor(prospect.relevance_score))}>
              {prospect.relevance_score}
            </span>
            <span className="text-xs text-text-secondary">Relevance Score</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <User className="w-4 h-4 text-brand-gold" />
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleFieldChange('first_name', e.target.value)}
                  placeholder="First name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleFieldChange('last_name', e.target.value)}
                  placeholder="Last name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Job title"
                className={inputClass}
              />
            </div>
          </div>

          {/* Company Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-gold" />
              Company
            </h3>

            <div>
              <label className={labelClass}>Company Name</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                placeholder="Company name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Company Type</label>
              <select
                value={formData.company_type}
                onChange={(e) => handleFieldChange('company_type', e.target.value)}
                className={inputClass}
              >
                {companyTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-gold" />
              Contact Information
            </h3>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="email@company.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={inputClass}
              />
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-gold" />
              Location
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={formData.location_city}
                  onChange={(e) => handleFieldChange('location_city', e.target.value)}
                  placeholder="City"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={formData.location_state}
                  onChange={(e) => handleFieldChange('location_state', e.target.value)}
                  placeholder="State"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                value={formData.location_country}
                onChange={(e) => handleFieldChange('location_country', e.target.value)}
                placeholder="Country"
                className={inputClass}
              />
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-gold" />
              Links
            </h3>

            <div>
              <label className={labelClass}>LinkedIn URL</label>
              <input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => handleFieldChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleFieldChange('website', e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-gold" />
              Categories
            </h3>

            <div>
              <label className={labelClass}>CCC Verticals</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {verticalOptions.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVertical(v)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors',
                      formData.ccc_verticals.includes(v)
                        ? 'bg-brand-gold/10 border-brand-gold text-brand-gold-dark'
                        : 'bg-surface-secondary border-border text-text-muted hover:border-brand-gold/50'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Target Roles</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {roleOptions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors',
                      formData.target_roles.includes(r)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-surface-secondary border-border text-text-muted hover:border-blue-300'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div>
            <Select
              label="Status"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
            />
          </div>

          {/* Notes Section */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Add notes about this prospect..."
              className={cn(inputClass, 'h-24 resize-none')}
            />
          </div>

          {/* Source URL (extracted from AI summary) */}
          {prospect.ai_summary?.includes('Extracted from:') && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                <Globe className="w-3 h-3 text-blue-500" />
                Source
              </h3>
              {(() => {
                const match = prospect.ai_summary?.match(/Extracted from:\s*(https?:\/\/[^\s]+)/)
                const url = match?.[1]
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all flex items-center gap-1"
                  >
                    {url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  <p className="text-xs text-text-secondary">
                    {prospect.ai_summary?.replace('Extracted from:', 'Source:')}
                  </p>
                )
              })()}
            </div>
          )}

          {/* AI Summary (read-only) */}
          {prospect.ai_summary && !prospect.ai_summary.includes('Extracted from:') && (
            <div className="p-3 bg-surface-secondary rounded-lg">
              <h3 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-brand-gold" />
                AI Summary (auto-generated)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {prospect.ai_summary}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-3 border-t border-border text-xs text-text-muted space-y-1">
            <p>Created: {formatDate(prospect.created_at)}</p>
            <p>Updated: {formatDate(prospect.updated_at)}</p>
          </div>
        </div>

        {/* Footer - Save Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="gold"
            className="w-full"
            onClick={handleSave}
            loading={updateMutation.isPending}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4" />
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </div>
      </motion.div>
    </>
  )
}
