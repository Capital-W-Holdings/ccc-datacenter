import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Linkedin,
  Phone,
  Loader2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import type { Prospect, CompanyType, CCCVertical, TargetRole } from '@/types'
import { prospectsApi } from '@/lib/api'
import { cn, getScoreColor, getScoreBgColor } from '@/lib/utils'

interface ProspectQuickViewModalProps {
  prospectId: string | null
  isOpen: boolean
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

export default function ProspectQuickViewModal({ prospectId, isOpen, onClose }: ProspectQuickViewModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null)

  // Fetch prospect data
  const { data: prospectData, isLoading } = useQuery({
    queryKey: ['prospect', prospectId],
    queryFn: () => prospectsApi.get(prospectId!),
    enabled: !!prospectId && isOpen,
  })

  const prospect = prospectData?.data

  // Initialize form when prospect loads
  useEffect(() => {
    if (prospect) {
      setFormData({
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
    }
  }, [prospect])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Prospect>) =>
      prospectsApi.update(prospectId!, data),
    onSuccess: () => {
      toast.success('Prospect updated')
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['prospect', prospectId] })
      queryClient.invalidateQueries({ queryKey: ['event-prospects'] })
    },
    onError: () => {
      toast.error('Failed to update prospect')
    },
  })

  const handleSave = () => {
    if (!formData) return
    const updateData: Partial<Prospect> = {
      first_name: (formData.first_name as string) || null,
      last_name: (formData.last_name as string) || null,
      full_name: `${formData.first_name} ${formData.last_name}`.trim(),
      title: (formData.title as string) || null,
      company: (formData.company as string) || null,
      company_type: ((formData.company_type as string) || null) as CompanyType | null,
      email: (formData.email as string) || null,
      phone: (formData.phone as string) || null,
      linkedin_url: (formData.linkedin_url as string) || null,
      website: (formData.website as string) || null,
      location_city: (formData.location_city as string) || null,
      location_state: (formData.location_state as string) || null,
      location_country: (formData.location_country as string) || 'US',
      ccc_verticals: formData.ccc_verticals as CCCVertical[],
      target_roles: formData.target_roles as TargetRole[],
      status: formData.status as Prospect['status'],
      notes: (formData.notes as string) || null,
    }
    updateMutation.mutate(updateData)
  }

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null)
  }

  const toggleVertical = (vertical: CCCVertical) => {
    if (!formData) return
    const current = formData.ccc_verticals as CCCVertical[]
    handleFieldChange(
      'ccc_verticals',
      current.includes(vertical)
        ? current.filter(v => v !== vertical)
        : [...current, vertical]
    )
  }

  const toggleRole = (role: TargetRole) => {
    if (!formData) return
    const current = formData.target_roles as TargetRole[]
    handleFieldChange(
      'target_roles',
      current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role]
    )
  }

  // Check for changes
  const hasChanges = prospect && formData && (
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
  )

  const inputClass = "w-full px-3 py-2 rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
  const labelClass = "block text-xs font-medium text-text-muted mb-1"

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[650px] max-h-[85vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {isLoading || !prospect || !formData ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-text-primary truncate">
                        {prospect.full_name}
                      </h2>
                      <p className="text-sm text-text-muted truncate">
                        {prospect.title} {prospect.company && `at ${prospect.company}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                          getScoreBgColor(prospect.relevance_score),
                        )}
                      >
                        <Sparkles className={cn('w-3.5 h-3.5', getScoreColor(prospect.relevance_score))} />
                        <span className={cn('font-mono text-sm font-semibold', getScoreColor(prospect.relevance_score))}>
                          {prospect.relevance_score}
                        </span>
                      </div>
                      <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="flex items-center gap-2 mt-3">
                    {prospect.email && (
                      <a
                        href={`mailto:${prospect.email}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        {prospect.email}
                      </a>
                    )}
                    {prospect.phone && (
                      <a
                        href={`tel:${prospect.phone}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {prospect.phone}
                      </a>
                    )}
                    {prospect.linkedin_url && (
                      <a
                        href={prospect.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#0A66C2]/10 text-[#0A66C2] rounded-lg hover:bg-[#0A66C2]/20 transition-colors"
                      >
                        <Linkedin className="w-3 h-3" />
                        LinkedIn
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left column */}
                    <div className="space-y-4">
                      {/* Basic Info */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
                          <User className="w-3 h-3" /> Basic Info
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>First Name</label>
                            <input
                              type="text"
                              value={formData.first_name as string}
                              onChange={(e) => handleFieldChange('first_name', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Last Name</label>
                            <input
                              type="text"
                              value={formData.last_name as string}
                              onChange={(e) => handleFieldChange('last_name', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Title</label>
                          <input
                            type="text"
                            value={formData.title as string}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Company */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Company
                        </h3>
                        <div>
                          <label className={labelClass}>Company Name</label>
                          <input
                            type="text"
                            value={formData.company as string}
                            onChange={(e) => handleFieldChange('company', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Company Type</label>
                          <select
                            value={formData.company_type as string}
                            onChange={(e) => handleFieldChange('company_type', e.target.value)}
                            className={inputClass}
                          >
                            {companyTypeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Contact
                        </h3>
                        <div>
                          <label className={labelClass}>Email</label>
                          <input
                            type="email"
                            value={formData.email as string}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Phone</label>
                          <input
                            type="tel"
                            value={formData.phone as string}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                      {/* Location */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Location
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={labelClass}>City</label>
                            <input
                              type="text"
                              value={formData.location_city as string}
                              onChange={(e) => handleFieldChange('location_city', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>State</label>
                            <input
                              type="text"
                              value={formData.location_state as string}
                              onChange={(e) => handleFieldChange('location_state', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Links */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Links
                        </h3>
                        <div>
                          <label className={labelClass}>LinkedIn</label>
                          <input
                            type="url"
                            value={formData.linkedin_url as string}
                            onChange={(e) => handleFieldChange('linkedin_url', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Website</label>
                          <input
                            type="url"
                            value={formData.website as string}
                            onChange={(e) => handleFieldChange('website', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Categories */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Categories
                        </h3>
                        <div>
                          <label className={labelClass}>Verticals</label>
                          <div className="flex flex-wrap gap-1.5">
                            {verticalOptions.map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => toggleVertical(v)}
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded-full border transition-colors',
                                  (formData.ccc_verticals as CCCVertical[]).includes(v)
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
                          <div className="flex flex-wrap gap-1.5">
                            {roleOptions.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => toggleRole(r)}
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded-full border transition-colors',
                                  (formData.target_roles as TargetRole[]).includes(r)
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

                      {/* Status */}
                      <div>
                        <Select
                          label="Status"
                          options={statusOptions}
                          value={formData.status as string}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes - full width */}
                  <div className="mt-4">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      value={formData.notes as string}
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      placeholder="Add notes..."
                      className={cn(inputClass, 'h-20 resize-none')}
                    />
                  </div>

                  {/* Source URL */}
                  {prospect.ai_summary?.includes('Extracted from:') && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h3 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
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
                            {url.length > 60 ? url.slice(0, 60) + '...' : url}
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

                  {/* AI Summary */}
                  {prospect.ai_summary && !prospect.ai_summary.includes('Extracted from:') && (
                    <div className="mt-4 p-3 bg-surface-secondary rounded-lg">
                      <h3 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-brand-gold" />
                        AI Summary
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">
                        {prospect.ai_summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex-shrink-0 flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    variant="gold"
                    onClick={handleSave}
                    loading={updateMutation.isPending}
                    disabled={!hasChanges}
                  >
                    <Save className="w-4 h-4" />
                    {hasChanges ? 'Save Changes' : 'No Changes'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
