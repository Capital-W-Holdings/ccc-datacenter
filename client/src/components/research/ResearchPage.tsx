import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { scrapersApi } from '@/lib/api'
import ScraperCard from './ScraperCard'
import ScraperConfigModal from './ScraperConfigModal'
import ScrapeProgressModal from './ScrapeProgressModal'
import AIResearchModal from './AIResearchModal'
import type { Scraper } from '@/types'

export default function ResearchPage() {
  const queryClient = useQueryClient()
  const [configScraper, setConfigScraper] = useState<Scraper | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeScraperId, setActiveScraperId] = useState<string | null>(null)
  const [showAIResearch, setShowAIResearch] = useState(false)
  const [aiResearchJobId, setAIResearchJobId] = useState<string | null>(null)

  // Fetch scrapers
  const { data: scrapersResponse, isLoading } = useQuery({
    queryKey: ['scrapers'],
    queryFn: scrapersApi.list,
  })

  // Run scraper mutation
  const runMutation = useMutation({
    mutationFn: (id: string) => scrapersApi.run(id),
    onSuccess: (data, scraperId) => {
      setActiveJobId(data.data.job_id)
      setActiveScraperId(scraperId)
      queryClient.invalidateQueries({ queryKey: ['scrapers'] })
    },
    onError: () => {
      toast.error('Failed to start scraper')
    },
  })

  // Toggle scraper mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      scrapersApi.toggle(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapers'] })
    },
    onError: () => {
      toast.error('Failed to toggle scraper')
    },
  })

  const scrapers = scrapersResponse?.data ?? []

  // Group scrapers by type
  const scrapersByType = scrapers.reduce(
    (acc, scraper) => {
      const type = scraper.type
      if (!acc[type]) acc[type] = []
      acc[type].push(scraper)
      return acc
    },
    {} as Record<string, Scraper[]>,
  )

  const typeLabels: Record<string, { label: string; description: string }> = {
    ai_research: {
      label: 'AI Research Scrapers',
      description: 'AI-powered research to find prospects based on natural language queries',
    },
    conference: {
      label: 'Conference & Event Scrapers',
      description: 'Extract attendees, speakers, and sponsors from industry events',
    },
    directory: {
      label: 'Industry Directory Scrapers',
      description: 'Pull member data from professional associations and directories',
    },
    news: {
      label: 'News & PR Scrapers',
      description: 'Find executives mentioned in industry news and press releases',
    },
    company: {
      label: 'Company Page Scrapers',
      description: 'Extract leadership teams from target company websites',
    },
    cre_deal: {
      label: 'CRE Deal Scrapers',
      description: 'Find deal parties from commercial real estate transactions',
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary heading-gold-accent">
            Research Engine
          </h2>
          <p className="text-text-secondary mt-1">
            Configure and run scrapers to gather prospect intelligence
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowAIResearch(true)}>
          <Sparkles className="w-4 h-4" />
          AI Research
        </Button>
      </div>

      {/* Scrapers by type */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-surface-secondary" />
          ))}
        </div>
      ) : (
        Object.entries(typeLabels).map(([type, info]) => {
          const typeScrapers = scrapersByType[type] || []
          return (
            <div key={type}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-text-primary">
                  {info.label}
                </h3>
                <p className="text-sm text-text-muted">{info.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeScrapers.length > 0 ? (
                  typeScrapers.map((scraper) => (
                    <ScraperCard
                      key={scraper.id}
                      scraper={scraper}
                      onConfigure={() => setConfigScraper(scraper)}
                      onRun={() => runMutation.mutate(scraper.id)}
                      onToggle={(active) =>
                        toggleMutation.mutate({ id: scraper.id, is_active: active })
                      }
                      running={runMutation.isPending}
                    />
                  ))
                ) : (
                  <Card padding="md" className="border-dashed">
                    <p className="text-sm text-text-muted text-center">
                      No scrapers configured for this type
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Config Modal */}
      {configScraper && (
        <ScraperConfigModal
          scraper={configScraper}
          onClose={() => setConfigScraper(null)}
        />
      )}

      {/* Progress Modal */}
      {activeJobId && activeScraperId && (
        <ScrapeProgressModal
          jobId={activeJobId}
          scraperId={activeScraperId}
          onClose={() => {
            setActiveJobId(null)
            setActiveScraperId(null)
          }}
        />
      )}

      {/* AI Research Modal */}
      {showAIResearch && (
        <AIResearchModal
          onClose={() => {
            setShowAIResearch(false)
            if (aiResearchJobId) {
              queryClient.invalidateQueries({ queryKey: ['prospects'] })
            }
          }}
          onJobStarted={(jobId) => setAIResearchJobId(jobId)}
        />
      )}
    </div>
  )
}
