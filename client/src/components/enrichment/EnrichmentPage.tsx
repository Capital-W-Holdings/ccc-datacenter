import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, Clock, CheckCircle } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { enrichmentApi } from '@/lib/api'
import EnrichmentQueue from './EnrichmentQueue'
import EnrichmentProgress from './EnrichmentProgress'

const batchSizeOptions = [
  { value: '10', label: '10 prospects' },
  { value: '25', label: '25 prospects' },
  { value: '50', label: '50 prospects' },
  { value: '100', label: '100 prospects' },
]

export default function EnrichmentPage() {
  const queryClient = useQueryClient()
  const [batchSize, setBatchSize] = useState('25')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // Fetch queue
  const { data: queueResponse, isLoading: queueLoading } = useQuery({
    queryKey: ['enrichment', 'queue'],
    queryFn: enrichmentApi.getQueue,
    refetchInterval: activeJobId ? 5000 : 30000,
  })

  // Fetch stats
  const { data: statsResponse } = useQuery({
    queryKey: ['enrichment', 'stats'],
    queryFn: enrichmentApi.getStats,
    refetchInterval: activeJobId ? 5000 : 60000,
  })

  // Run enrichment mutation
  const runMutation = useMutation({
    mutationFn: () =>
      enrichmentApi.run({
        prospect_ids: queueResponse?.data.prospects
          .slice(0, parseInt(batchSize))
          .map((p) => p.id) || [],
        batch_size: parseInt(batchSize),
      }),
    onSuccess: (data) => {
      setActiveJobId(data.data.job_id)
      toast.success('Enrichment started')
    },
    onError: () => {
      toast.error('Failed to start enrichment')
    },
  })

  const handleEnrichmentComplete = () => {
    setActiveJobId(null)
    queryClient.invalidateQueries({ queryKey: ['enrichment'] })
    queryClient.invalidateQueries({ queryKey: ['prospects'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const queue = queueResponse?.data
  const queueCount = queue?.count ?? 0
  const stats = statsResponse?.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary heading-gold-accent">
            AI Enrichment Pipeline
          </h2>
          <p className="text-text-secondary mt-1">
            Use AI to categorize, score, and generate insights for prospects
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Awaiting Enrichment</p>
              <p className="metric-number text-text-primary">{queueCount}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Enriched Today</p>
              <p className="metric-number text-text-primary">
                {stats?.enriched_today ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand-gold/10">
              <Sparkles className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Avg. Score</p>
              <p className="metric-number text-text-primary">
                {stats?.avg_score ?? '--'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrichment Controls */}
        <Card padding="lg" className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Run Enrichment</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <Select
              label="Batch Size"
              options={batchSizeOptions}
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
            />

            <div className="p-4 bg-surface-secondary rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-2">
                What will be enriched:
              </h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Company classification</li>
                <li>• CCC Vertical mapping</li>
                <li>• Target role assignment</li>
                <li>• Relevance score (1-100)</li>
                <li>• AI-generated summary</li>
              </ul>
            </div>

            <Button
              variant="gold"
              className="w-full"
              onClick={() => runMutation.mutate()}
              disabled={queueCount === 0 || !!activeJobId}
              loading={runMutation.isPending}
            >
              <Sparkles className="w-4 h-4" />
              Enrich {Math.min(parseInt(batchSize), queueCount)} Prospects
            </Button>

            {queueCount === 0 && (
              <p className="text-sm text-text-muted text-center">
                No prospects awaiting enrichment
              </p>
            )}
          </div>
        </Card>

        {/* Queue Preview */}
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Enrichment Queue</CardTitle>
          </CardHeader>

          {activeJobId ? (
            <EnrichmentProgress
              jobId={activeJobId}
              onComplete={handleEnrichmentComplete}
            />
          ) : (
            <EnrichmentQueue
              prospects={queue?.prospects ?? []}
              loading={queueLoading}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
