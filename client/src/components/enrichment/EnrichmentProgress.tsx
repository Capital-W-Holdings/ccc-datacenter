import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import Progress from '@/components/ui/Progress'
import { enrichmentApi } from '@/lib/api'
import { useWS } from '@/providers/WebSocketProvider'
import type { EnrichmentResult } from '@/types'
import { cn, getScoreColor } from '@/lib/utils'

interface EnrichmentProgressProps {
  jobId: string
  onComplete: () => void
}

interface EnrichmentProgressEvent {
  jobId: string
  current: number
  total: number
  prospectName?: string
}

interface EnrichmentCompleteEvent {
  jobId: string
  enrichedCount: number
  failedCount: number
}

export default function EnrichmentProgress({
  jobId,
  onComplete,
}: EnrichmentProgressProps) {
  const queryClient = useQueryClient()
  const { on, subscribe, unsubscribe, isConnected } = useWS()

  const [status, setStatus] = useState<{
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: number
    current: number
    total: number
    currentProspect?: string
    results: EnrichmentResult[]
  }>({
    status: 'pending',
    progress: 0,
    current: 0,
    total: 0,
    results: [],
  })

  // Subscribe to WebSocket events for real-time progress
  useEffect(() => {
    if (!isConnected) return

    // Subscribe to enrichment room
    subscribe('enrichment')

    // Handle progress updates
    const cleanupProgress = on('enrichment:progress', (data: unknown) => {
      const event = data as EnrichmentProgressEvent
      if (event.jobId === jobId) {
        setStatus((prev) => ({
          ...prev,
          status: 'running',
          progress: event.total > 0 ? (event.current / event.total) * 100 : 0,
          current: event.current,
          total: event.total,
          currentProspect: event.prospectName,
        }))
      }
    })

    // Handle completion
    const cleanupComplete = on('enrichment:complete', (data: unknown) => {
      const event = data as EnrichmentCompleteEvent
      if (event.jobId === jobId) {
        setStatus((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
        }))
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['prospects'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      }
    })

    return () => {
      cleanupProgress()
      cleanupComplete()
      unsubscribe('enrichment')
    }
  }, [isConnected, jobId, on, subscribe, unsubscribe, queryClient])

  // Fallback: Poll for status if WebSocket not connected (graceful degradation)
  useEffect(() => {
    if (isConnected) return // Use WebSocket when available
    if (status.status === 'completed' || status.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const response = await enrichmentApi.getStatus(jobId)
        setStatus((prev) => ({
          ...prev,
          status: response.data.status,
          progress: response.data.progress,
          results: response.data.results || prev.results,
        }))
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, status.status, isConnected])

  // Auto-close on complete
  useEffect(() => {
    if (status.status === 'completed' || status.status === 'failed') {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [status.status, onComplete])

  const successCount = status.results.filter((r) => r.success).length
  const failCount = status.results.filter((r) => !r.success).length

  return (
    <div className="space-y-4 relative">
      {/* Connection status indicator */}
      <div className="absolute top-0 right-0 flex items-center gap-1.5">
        {isConnected ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-500">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Polling</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            {status.status === 'completed'
              ? 'Enrichment Complete!'
              : status.status === 'failed'
                ? 'Enrichment Failed'
                : status.currentProspect
                  ? `Enriching: ${status.currentProspect}`
                  : 'Enriching prospects...'}
          </span>
          <span className="text-sm font-mono text-text-secondary">
            {Math.round(status.progress)}%
          </span>
        </div>
        <Progress
          value={status.progress}
          variant={
            status.status === 'completed'
              ? 'success'
              : status.status === 'failed'
                ? 'danger'
                : 'gold'
          }
          animated={status.status === 'running' || status.status === 'pending'}
        />
        {status.total > 0 && status.status === 'running' && (
          <p className="text-xs text-text-tertiary mt-1">
            Processing {status.current} of {status.total} prospects
          </p>
        )}
      </div>

      {/* Stats */}
      {status.results.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span>{successCount} enriched</span>
          </div>
          {failCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-500">
              <XCircle className="w-4 h-4" />
              <span>{failCount} failed</span>
            </div>
          )}
        </div>
      )}

      {/* Recent results */}
      {status.results.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {status.results.slice(-10).map((result, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg text-sm',
                result.success ? 'bg-emerald-50' : 'bg-red-50',
              )}
            >
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-text-primary truncate block">
                  {result.prospect_id.slice(0, 8)}...
                </span>
              </div>
              {result.success && result.changes.relevance_score && (
                <span
                  className={cn(
                    'font-mono font-semibold',
                    getScoreColor(result.changes.relevance_score),
                  )}
                >
                  {result.changes.relevance_score}
                </span>
              )}
              {result.error && (
                <span className="text-xs text-red-600 truncate">
                  {result.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {(status.status === 'pending' || status.status === 'running') && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
        </div>
      )}
    </div>
  )
}
