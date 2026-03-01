import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { prospectsApi } from '@/lib/api'
import type { CompanyType, ProspectStatus } from '@/types'

interface AddProspectModalProps {
  onClose: () => void
}

const companyTypes = [
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

const statuses: ProspectStatus[] = ['New', 'Qualified', 'Contacted', 'Engaged', 'Nurturing', 'Archived']

export default function AddProspectModal({ onClose }: AddProspectModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    title: '',
    company: '',
    company_type: '',
    email: '',
    phone: '',
    linkedin_url: '',
    location_city: '',
    location_state: '',
    status: 'New',
    notes: '',
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim()
      return prospectsApi.create({
        ...formData,
        company_type: (formData.company_type || null) as CompanyType | null,
        status: formData.status as ProspectStatus,
        full_name: fullName || formData.company || 'Unknown',
        ccc_verticals: [],
        target_roles: ['Attendee'],
        relevance_score: 50,
      })
    },
    onSuccess: () => {
      toast.success('Prospect added successfully')
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to add prospect')
    },
  })

  const handleSubmit = () => {
    if (!formData.first_name && !formData.last_name && !formData.company) {
      toast.error('Please provide at least a name or company')
      return
    }
    createMutation.mutate()
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Prospect"
      description="Manually add a new prospect to your database"
      size="lg"
    >
      <div className="space-y-6">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="John"
            value={formData.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
          />
          <Input
            label="Last Name"
            placeholder="Smith"
            value={formData.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
          />
        </div>

        {/* Title & Company */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Title"
            placeholder="VP of Data Centers"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
          <Input
            label="Company"
            placeholder="Equinix"
            value={formData.company}
            onChange={(e) => updateField('company', e.target.value)}
          />
        </div>

        {/* Company Type & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Company Type
            </label>
            <select
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
              value={formData.company_type}
              onChange={(e) => updateField('company_type', e.target.value)}
            >
              <option value="">Select type...</option>
              {companyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="john.smith@company.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
          <Input
            label="Phone"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>

        {/* LinkedIn */}
        <Input
          label="LinkedIn URL"
          placeholder="https://linkedin.com/in/johnsmith"
          value={formData.linkedin_url}
          onChange={(e) => updateField('linkedin_url', e.target.value)}
        />

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City"
            placeholder="Dallas"
            value={formData.location_city}
            onChange={(e) => updateField('location_city', e.target.value)}
          />
          <Input
            label="State"
            placeholder="TX"
            value={formData.location_state}
            onChange={(e) => updateField('location_state', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Notes
          </label>
          <textarea
            className="w-full h-20 rounded-lg border border-border bg-white px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold
              placeholder:text-text-muted resize-none"
            placeholder="Any additional notes about this prospect..."
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleSubmit}
            loading={createMutation.isPending}
          >
            Add Prospect
          </Button>
        </div>
      </div>
    </Modal>
  )
}
