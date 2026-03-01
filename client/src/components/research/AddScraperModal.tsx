import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { scrapersApi } from '@/lib/api'
import type { Scraper, ScraperConfig } from '@/types'

interface AddScraperModalProps {
  onClose: () => void
}

const scraperTypes: { value: Scraper['type']; label: string }[] = [
  { value: 'conference', label: 'Conference & Events' },
  { value: 'directory', label: 'Industry Directory' },
  { value: 'news', label: 'News & PR' },
  { value: 'company', label: 'Company Pages' },
  { value: 'cre_deal', label: 'CRE Deals' },
]

export default function AddScraperModal({ onClose }: AddScraperModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<Scraper['type']>('conference')
  const [description, setDescription] = useState('')
  const [config, setConfig] = useState<ScraperConfig>({
    urls: [],
    keywords: [],
    pagination: { type: 'page', max_pages: 10 },
  })
  const [newUrl, setNewUrl] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      scrapersApi.create({
        name,
        type,
        description: description || undefined,
        config,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Scraper created successfully')
      queryClient.invalidateQueries({ queryKey: ['scrapers'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to create scraper')
    },
  })

  const addUrl = () => {
    if (!newUrl.trim()) return
    try {
      new URL(newUrl)
      setConfig((prev) => ({
        ...prev,
        urls: [...(prev.urls || []), newUrl.trim()],
      }))
      setNewUrl('')
    } catch {
      toast.error('Please enter a valid URL')
    }
  }

  const removeUrl = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      urls: prev.urls?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Please enter a scraper name')
      return
    }
    if (!config.urls || config.urls.length === 0) {
      toast.error('Please add at least one target URL')
      return
    }
    createMutation.mutate()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Custom Scraper"
      description="Create a new scraper to gather prospect data from any website"
      size="lg"
    >
      <div className="space-y-6">
        {/* Name and Type */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Scraper Name"
            placeholder="e.g., Data Center Summit 2025"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Type
            </label>
            <select
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
              value={type}
              onChange={(e) => setType(e.target.value as Scraper['type'])}
            >
              {scraperTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <Input
          label="Description (optional)"
          placeholder="Brief description of what this scraper extracts"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Target URLs */}
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Target URLs
          </h4>
          <div className="space-y-2 mb-3">
            {config.urls?.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2"
              >
                <span className="flex-1 text-sm text-text-secondary truncate">
                  {url}
                </span>
                <button
                  onClick={() => removeUrl(index)}
                  className="p-1 text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/speakers"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUrl()}
            />
            <Button variant="secondary" onClick={addUrl}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Pagination settings */}
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Pagination
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Type
              </label>
              <select
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                value={config.pagination?.type || 'page'}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    pagination: {
                      ...prev.pagination,
                      type: e.target.value as 'page' | 'scroll' | 'load_more',
                      max_pages: prev.pagination?.max_pages || 10,
                    },
                  }))
                }
              >
                <option value="page">Page numbers</option>
                <option value="scroll">Infinite scroll</option>
                <option value="load_more">Load more button</option>
              </select>
            </div>
            <Input
              label="Max Pages"
              type="number"
              min={1}
              max={50}
              value={config.pagination?.max_pages || 10}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  pagination: {
                    type: prev.pagination?.type || 'page',
                    max_pages: parseInt(e.target.value) || 10,
                  },
                }))
              }
            />
          </div>
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
            Create Scraper
          </Button>
        </div>
      </div>
    </Modal>
  )
}
