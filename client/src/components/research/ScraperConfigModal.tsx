import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Scraper, ScraperConfig } from '@/types'
import { scrapersApi } from '@/lib/api'

interface ScraperConfigModalProps {
  scraper: Scraper
  onClose: () => void
}

export default function ScraperConfigModal({
  scraper,
  onClose,
}: ScraperConfigModalProps) {
  const queryClient = useQueryClient()
  const [config, setConfig] = useState<ScraperConfig>(scraper.config)
  const [newUrl, setNewUrl] = useState('')

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: (newConfig: ScraperConfig) =>
      scrapersApi.updateConfig(scraper.id, newConfig),
    onSuccess: () => {
      toast.success('Scraper configuration saved')
      queryClient.invalidateQueries({ queryKey: ['scrapers'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to save configuration')
    },
  })

  const addUrl = () => {
    if (!newUrl.trim()) return
    try {
      new URL(newUrl) // Validate URL
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

  const addKeyword = (keyword: string) => {
    if (!keyword.trim()) return
    setConfig((prev) => ({
      ...prev,
      keywords: [...(prev.keywords || []), keyword.trim()],
    }))
  }

  const removeKeyword = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      keywords: prev.keywords?.filter((_, i) => i !== index) || [],
    }))
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Configure: ${scraper.name}`}
      description="Set up the URLs and options for this scraper"
      size="lg"
    >
      <div className="space-y-6">
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

        {/* Keywords */}
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">
            Keywords (Optional)
          </h4>
          <p className="text-sm text-text-muted mb-3">
            Filter results to include only prospects with these keywords in their profile
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {config.keywords?.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-brand-gold/10 text-brand-gold-dark rounded text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(index)}
                  className="hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            placeholder="Add keyword (e.g., 'data center', 'hyperscale')"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addKeyword((e.target as HTMLInputElement).value)
                ;(e.target as HTMLInputElement).value = ''
              }
            }}
          />
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
            onClick={() => updateMutation.mutate(config)}
            loading={updateMutation.isPending}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </Modal>
  )
}
