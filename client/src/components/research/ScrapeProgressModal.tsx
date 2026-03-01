import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Loader2, Download, Wifi, WifiOff } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import { scrapersApi } from '@/lib/api'
import { useWS } from '@/providers/WebSocketProvider'

interface ScrapeProgressModalProps {
  jobId: string
  scraperId: string
  onClose: () => void
}

interface ScraperProgress {
  jobId: string
  scraperId: string
  progress: number
  current: number
  total: number
  message: string
}

interface ScraperComplete {
  jobId: string
  scraperId: string
  resultsCount: number
  savedCount: number
  duration: number
}

interface ScraperError {
  jobId: string
  scraperId: string
  error: string
}

export default function ScrapeProgressModal({
  jobId,
  scraperId,
  onClose,
}: ScrapeProgressModalProps) {
  const queryClient = useQueryClient()
  const { on, subscribe, unsubscribe, isConnected } = useWS()

  const [status, setStatus] = useState<{
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: number
    current: number
    total: number
    message: string
    results_count: number
    saved_count: number
    duration?: number
    error?: string
  }>({
    status: 'pending',
    progress: 0,
    current: 0,
    total: 0,
    message: 'Initializing scraper...',
    results_count: 0,
    saved_count: 0,
  })

  // Subscribe to WebSocket events for real-time progress
  useEffect(() => {
    if (!isConnected) return

    // Subscribe to scraper-specific room
    const room = `scraper:${scraperId}`
    subscribe(room)

    // Handle progress updates
    const cleanupProgress = on('scraper:progress', (data: unknown) => {
      const event = data as ScraperProgress
      if (event.jobId === jobId || event.scraperId === scraperId) {
        setStatus((prev) => ({
          ...prev,
          status: 'running',
          progress: event.progress,
          current: event.current,
          total: event.total,
          message: event.message,
        }))
      }
    })

    // Handle completion
    const cleanupComplete = on('scraper:complete', (data: unknown) => {
      const event = data as ScraperComplete
      if (event.jobId === jobId || event.scraperId === scraperId) {
        setStatus((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          results_count: event.resultsCount,
          saved_count: event.savedCount,
          duration: event.duration,
          message: 'Scraping completed!',
        }))
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['scrapers'] })
        queryClient.invalidateQueries({ queryKey: ['prospects'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      }
    })

    // Handle errors
    const cleanupError = on('scraper:error', (data: unknown) => {
      const event = data as ScraperError
      if (event.jobId === jobId || event.scraperId === scraperId) {
        setStatus((prev) => ({
          ...prev,
          status: 'failed',
          error: event.error,
          message: 'Scraping failed',
        }))
      }
    })

    return () => {
      cleanupProgress()
      cleanupComplete()
      cleanupError()
      unsubscribe(room)
    }
  }, [isConnected, jobId, scraperId, on, subscribe, unsubscribe, queryClient])

  // Fallback: Poll for status if WebSocket not connected (graceful degradation)
  useEffect(() => {
    if (isConnected) return // Use WebSocket when available
    if (status.status === 'completed' || status.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const response = await scrapersApi.getStatus(jobId)
        setStatus((prev) => ({
          ...prev,
          status: response.data.status,
          progress: response.data.progress,
          results_count: response.data.results_count,
          error: response.data.error,
        }))
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, status.status, isConnected])

  // Import results mutation
  const importMutation = useMutation({
    mutationFn: () => scrapersApi.importResults(jobId),
    onSuccess: (data) => {
      toast.success(`Imported ${data.data.imported} prospects`)
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to import results')
    },
  })

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
      case 'running':
        return <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
      case 'completed':
        return <CheckCircle className="w-12 h-12 text-emerald-500" />
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-500" />
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const handleClose = () => {
    if (status.status === 'running') {
      // Allow closing but warn the user
      if (window.confirm('Scraping is still in progress. Close anyway? (The job will continue in the background)')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="Scraping Progress"
      size="md"
      showClose={true}
    >
      <div className="text-center py-6">
        {/* Connection status indicator */}
        <div className="absolute top-4 right-12 flex items-center gap-1.5">
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

        {/* Status icon */}
        <div className="flex justify-center mb-4">{getStatusIcon()}</div>

        {/* Status message */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {status.message}
        </h3>

        {/* Progress bar */}
        {(status.status === 'pending' || status.status === 'running') && (
          <div className="mb-4">
            <Progress
              value={status.progress}
              variant="gold"
              showLabel
              animated
            />
            {status.total > 0 && (
              <p className="text-xs text-text-tertiary mt-1">
                Processing {status.current} of {status.total} items
              </p>
            )}
          </div>
        )}

        {/* Results summary */}
        {status.status === 'completed' && (
          <div className="mb-4 p-4 bg-surface-secondary rounded-lg">
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-2xl font-mono font-bold text-brand-gold">
                  {status.results_count}
                </p>
                <p className="text-xs text-text-tertiary">Found</p>
              </div>
              <div className="w-px bg-border-primary" />
              <div>
                <p className="text-2xl font-mono font-bold text-emerald-500">
                  {status.saved_count}
                </p>
                <p className="text-xs text-text-tertiary">New Prospects</p>
              </div>
              {status.duration && (
                <>
                  <div className="w-px bg-border-primary" />
                  <div>
                    <p className="text-2xl font-mono font-bold text-text-primary">
                      {formatDuration(status.duration)}
                    </p>
                    <p className="text-xs text-text-tertiary">Duration</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {status.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {status.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6">
          {status.status === 'completed' && status.saved_count > 0 && (
            <Button
              variant="gold"
              onClick={() => importMutation.mutate()}
              loading={importMutation.isPending}
            >
              <Download className="w-4 h-4" />
              Import {status.saved_count} Prospects
            </Button>
          )}
          {(status.status === 'completed' || status.status === 'failed') && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
