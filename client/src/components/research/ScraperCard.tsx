import { Play, Settings, Clock, Database } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Switch from '@/components/ui/Switch'
import type { Scraper } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

interface ScraperCardProps {
  scraper: Scraper
  onConfigure: () => void
  onRun: () => void
  onToggle: (active: boolean) => void
  running: boolean
}

export default function ScraperCard({
  scraper,
  onConfigure,
  onRun,
  onToggle,
  running,
}: ScraperCardProps) {
  const hasUrls = scraper.config.urls && scraper.config.urls.length > 0

  return (
    <Card padding="md" hover className="flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-text-primary">{scraper.name}</h4>
          <p className="text-sm text-text-muted mt-0.5">{scraper.description}</p>
        </div>
        <Switch
          checked={scraper.is_active}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
        {scraper.last_run && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(scraper.last_run)}</span>
          </div>
        )}
        {scraper.last_result_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>{scraper.last_result_count} found</span>
          </div>
        )}
      </div>

      {/* URLs configured */}
      {hasUrls && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1">
            {scraper.config.urls!.length} URL(s) configured
          </p>
          <div className="text-xs text-text-secondary truncate bg-surface-secondary rounded px-2 py-1">
            {scraper.config.urls![0]}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={onConfigure}
        >
          <Settings className="w-3.5 h-3.5" />
          Configure
        </Button>
        <Button
          variant="gold"
          size="sm"
          className="flex-1"
          onClick={onRun}
          disabled={!scraper.is_active || !hasUrls || running}
          loading={running}
        >
          <Play className="w-3.5 h-3.5" />
          Run Now
        </Button>
      </div>
    </Card>
  )
}
