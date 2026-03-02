import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, Search, Globe, Users, Plus, X, Save, Calendar, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useWebSocket } from '@/hooks/useWebSocket'
import { scrapersApi, researchApi, eventsApi, prospectsApi } from '@/lib/api'

interface AIResearchModalProps {
  onClose: () => void
  onJobStarted: (jobId: string) => void
}

interface ResearchProgress {
  stage: 'understanding' | 'searching' | 'analyzing' | 'scraping' | 'extracting' | 'enriching' | 'complete'
  message: string
  urlsFound?: number
  prospectsFound?: number       // New prospects (after dedup)
  totalExtracted?: number       // Total found before dedup
  emailsFound?: number
  verifiedCount?: number
  duplicatesSkipped?: number
  progress?: number
}

interface ResearchCriteria {
  description: string
  companyTypes: string[]
  titles: string[]
  locations: string[]
  industries: string[]
  companies: string[]
  maxUrls: number
}

const stageIcons = {
  understanding: Sparkles,
  searching: Search,
  analyzing: Globe,
  scraping: Globe,
  extracting: Users,
  enriching: Users,
  complete: Users,
}

const stageLabels = {
  understanding: 'Understanding your request...',
  searching: 'Searching the web for relevant sources...',
  analyzing: 'Analyzing potential data sources...',
  scraping: 'Extracting data from websites...',
  extracting: 'Processing and structuring prospects...',
  enriching: 'Finding email addresses...',
  complete: 'Research complete!',
}

const companyTypeOptions = [
  'Hyperscaler',
  'Developer/Operator',
  'Investor',
  'Construction',
  'Engineering',
  'Broker',
  'Consulting',
  'Legal',
  'Finance',
]

const commonTitles = [
  'VP',
  'Director',
  'C-Level',
  'SVP',
  'Head of',
  'Manager',
  'Principal',
  'Partner',
]

export default function AIResearchModal({ onClose, onJobStarted }: AIResearchModalProps) {
  const navigate = useNavigate()
  const [criteria, setCriteria] = useState<ResearchCriteria>({
    description: '',
    companyTypes: [],
    titles: [],
    locations: [],
    industries: [],
    companies: [],
    maxUrls: 10,
  })
  const [newLocation, setNewLocation] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [progress, setProgress] = useState<ResearchProgress | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [isAddingToEvents, setIsAddingToEvents] = useState(false)
  const [foundProspectIds, setFoundProspectIds] = useState<string[]>([])
  const { on } = useWebSocket()
  const queryClient = useQueryClient()

  // Refs to store cleanup function and polling interval
  const cleanupRef = useRef<(() => void) | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  // Fetch events for selection
  const { data: eventsData } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsApi.list({ status: 'upcoming' }),
  })

  const events = eventsData?.data ?? []

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const buildQuery = () => {
    const parts: string[] = []

    if (criteria.description) {
      parts.push(criteria.description)
    }

    if (criteria.titles.length > 0) {
      parts.push(`Looking for ${criteria.titles.join(', ')} level executives`)
    }

    if (criteria.companyTypes.length > 0) {
      parts.push(`at ${criteria.companyTypes.join(', ')} companies`)
    }

    if (criteria.industries.length > 0) {
      parts.push(`in the ${criteria.industries.join(', ')} industry`)
    }

    if (criteria.locations.length > 0) {
      parts.push(`located in ${criteria.locations.join(', ')}`)
    }

    if (criteria.companies.length > 0) {
      parts.push(`specifically at companies like ${criteria.companies.join(', ')}`)
    }

    return parts.join('. ') || 'Find relevant business prospects'
  }

  const startResearch = useMutation({
    mutationFn: async () => {
      const query = buildQuery()
      return researchApi.startAIResearch({ query, maxUrls: criteria.maxUrls })
    },
    onSuccess: (data) => {
      // Clean up any previous research polling/websocket
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      const jobId = data.data.job_id
      onJobStarted(jobId)

      // Set up WebSocket listener
      const eventName = `research:${jobId}`
      const wsCleanup = on(eventName, async (event) => {
        const progressEvent = event as ResearchProgress & { prospectIds?: string[] }
        setProgress(progressEvent)
        if (progressEvent.stage === 'complete') {
          // Clear polling interval
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          wsCleanup()
          cleanupRef.current = null
          handleComplete(progressEvent.prospectsFound || 0, progressEvent.prospectIds, {
            totalExtracted: progressEvent.totalExtracted,
            duplicatesSkipped: progressEvent.duplicatesSkipped,
            message: progressEvent.message,
            urlsFound: progressEvent.urlsFound,
          })
        }
      })

      // Also poll for status as fallback (WebSocket can be unreliable)
      let pollCount = 0
      const maxPollsBeforeWarning = 15 // ~30 seconds
      const maxPollsBeforeError = 30 // ~60 seconds

      console.log('[Research] Starting polling for job:', jobId)

      pollIntervalRef.current = setInterval(async () => {
        pollCount++

        try {
          const statusResponse = await researchApi.getAIResearchStatus(jobId)
          console.log('[Research] Poll #' + pollCount + ' response:', statusResponse.data)

          if (statusResponse.data) {
            const { status: state, progress: jobProgress, progressData: richProgress, result: returnvalue } = statusResponse.data

            // Prefer progressData (from job.data.lastProgress) over jobProgress
            // progressData contains rich progress with stage, message, etc.
            const progressObj = richProgress || (typeof jobProgress === 'object' ? jobProgress : null)
            const progressNumber = progressObj?.progress ?? (typeof jobProgress === 'number' ? jobProgress : undefined)

            console.log('[Research] State:', state, 'Progress:', progressNumber, 'ProgressData:', progressObj)

            // Map BullMQ state to our stages
            let stage: ResearchProgress['stage'] = 'understanding'
            let message = 'Starting research...'

            if (state === 'waiting' || state === 'delayed') {
              // Job is queued, waiting to start
              stage = 'understanding'
              if (pollCount > maxPollsBeforeWarning) {
                message = 'Job queued but workers may not be running. Check server logs.'
              } else {
                message = 'Queued, waiting to start...'
              }
              setProgress({ stage, message })

              // If stuck too long, show error
              if (pollCount >= maxPollsBeforeError) {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                }
                wsCleanup()
                cleanupRef.current = null
                toast.error('Research job timed out. Workers may not be running - check Redis connection.')
                setProgress(null)
                return
              }
            } else if (state === 'active') {
              if (progressObj?.stage) {
                // Use rich progress data from server
                stage = progressObj.stage as ResearchProgress['stage']
                message = progressObj.message || stageLabels[stage] || `Processing (${stage})...`
              } else {
                // Fallback: use progress percentage to determine stage
                if (progressNumber !== undefined && progressNumber >= 80) {
                  stage = 'extracting'
                  message = 'Extracting prospects...'
                } else if (progressNumber !== undefined && progressNumber >= 50) {
                  stage = 'scraping'
                  message = 'Scraping web pages...'
                } else if (progressNumber !== undefined && progressNumber >= 20) {
                  stage = 'analyzing'
                  message = 'Analyzing sources...'
                } else {
                  stage = 'searching'
                  message = progressNumber !== undefined ? `Searching... (${progressNumber}%)` : 'Processing...'
                }
              }
              setProgress({
                stage,
                message,
                urlsFound: progressObj?.urlsFound,
                prospectsFound: progressObj?.prospectsFound,
                totalExtracted: progressObj?.totalExtracted,
                emailsFound: progressObj?.emailsFound,
                verifiedCount: progressObj?.verifiedCount,
                duplicatesSkipped: progressObj?.duplicatesSkipped,
                progress: progressNumber,
              })
            } else if (state === 'completed') {
              console.log('[Research] Job completed!')
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              wsCleanup()
              cleanupRef.current = null
              // Handle nested result structure
              const resultData = returnvalue?.data || returnvalue
              const prospectsFound = resultData?.savedCount || resultData?.prospectsFound || progressObj?.prospectsFound || 0
              handleComplete(prospectsFound, resultData?.prospectIds, {
                totalExtracted: progressObj?.totalExtracted,
                duplicatesSkipped: progressObj?.duplicatesSkipped,
                message: progressObj?.message,
                urlsFound: progressObj?.urlsFound,
              })
            } else if (state === 'failed') {
              console.log('[Research] Job failed!')
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              wsCleanup()
              cleanupRef.current = null
              toast.error('Research failed. Please try again.')
              setProgress(null)
            } else {
              // Unknown state - log it and show something
              console.warn('[Research] Unknown state:', state)
              setProgress({
                stage: 'understanding',
                message: `Processing... (state: ${state})`,
                progress: progressNumber,
              })
            }
          } else {
            console.warn('[Research] No data in response')
            // Still show something to user
            if (pollCount === 1) {
              toast.error('No response from server. Check API connection.')
            }
          }
        } catch (err) {
          console.error('[Research] Polling error:', err)
          // Show toast on first error so user knows something is wrong
          if (pollCount === 1) {
            toast.error('Failed to connect. Retrying...')
          }
          // If we've been polling a while and keep getting errors, give up
          if (pollCount >= maxPollsBeforeError) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            wsCleanup()
            cleanupRef.current = null
            toast.error('Failed to get research status. Check server connection.')
            setProgress(null)
          }
          // Continue polling - might be a temporary network issue
        }
      }, 2000)

      // Store cleanup function in ref for proper cleanup
      cleanupRef.current = () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        wsCleanup()
      }

      setProgress({ stage: 'understanding', message: 'Starting research...' })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleComplete = async (
    prospectsFound: number,
    prospectIds?: string[],
    extraData?: { totalExtracted?: number; duplicatesSkipped?: number; message?: string; urlsFound?: number }
  ) => {
    // Show appropriate toast based on results
    if (prospectsFound > 0) {
      toast.success(`Found ${prospectsFound} new prospects!`)
    } else if (extraData?.totalExtracted && extraData.totalExtracted > 0) {
      toast(`Found ${extraData.totalExtracted} prospects, but all were already in your database.`, { icon: 'ℹ️' })
    } else {
      toast('No new prospects found.', { icon: 'ℹ️' })
    }
    queryClient.invalidateQueries({ queryKey: ['prospects'] })

    // Build completion message
    let message = 'Research complete!'
    if (extraData?.message) {
      message = extraData.message
    } else if (prospectsFound === 0 && extraData?.totalExtracted && extraData.totalExtracted > 0) {
      message = `Found ${extraData.totalExtracted} prospects but all were already in your database.`
    }

    setProgress({
      stage: 'complete',
      message,
      prospectsFound,
      totalExtracted: extraData?.totalExtracted,
      duplicatesSkipped: extraData?.duplicatesSkipped,
      urlsFound: extraData?.urlsFound,
    })

    // Capture prospect IDs if provided, otherwise fetch recent prospects
    if (prospectIds && prospectIds.length > 0) {
      setFoundProspectIds(prospectIds)
    } else if (prospectsFound > 0) {
      try {
        const recentProspects = await prospectsApi.list({
          page: 1,
          per_page: prospectsFound,
          sort_by: 'created_at',
          sort_dir: 'desc',
        })
        if (recentProspects.data) {
          setFoundProspectIds(recentProspects.data.slice(0, prospectsFound).map(p => p.id))
        }
      } catch {
        // Silent fail - user can still manually add to events
      }
    }
  }

  const handleSubmit = () => {
    // At minimum need some criteria
    const hasAnyCriteria =
      criteria.description ||
      criteria.companyTypes.length > 0 ||
      criteria.titles.length > 0 ||
      criteria.locations.length > 0 ||
      criteria.industries.length > 0 ||
      criteria.companies.length > 0

    if (!hasAnyCriteria) {
      toast.error('Please provide at least some search criteria')
      return
    }
    startResearch.mutate()
  }

  const toggleArrayItem = (
    field: 'companyTypes' | 'titles',
    value: string
  ) => {
    setCriteria((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }))
  }

  const addToArray = (
    field: 'locations' | 'industries' | 'companies',
    value: string,
    clearFn: (val: string) => void
  ) => {
    if (!value.trim()) return
    setCriteria((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }))
    clearFn('')
  }

  const removeFromArray = (
    field: 'locations' | 'industries' | 'companies',
    index: number
  ) => {
    setCriteria((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const CurrentStageIcon = progress ? (stageIcons[progress.stage] || Sparkles) : Sparkles

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="AI Research Assistant"
      description="Tell me what prospects you're looking for"
      size="lg"
    >
      <div className="space-y-6">
        {!progress ? (
          <>
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                What are you looking for? (optional)
              </label>
              <textarea
                className="w-full h-20 rounded-lg border border-border bg-white px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold
                  placeholder:text-text-muted resize-none"
                placeholder="e.g., Executives who attend data center conferences and might be interested in our summit..."
                value={criteria.description}
                onChange={(e) =>
                  setCriteria((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* Company Types */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Company Types
              </label>
              <div className="flex flex-wrap gap-2">
                {companyTypeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleArrayItem('companyTypes', type)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      criteria.companyTypes.includes(type)
                        ? 'bg-brand-gold text-white'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Titles */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Job Title Level
              </label>
              <div className="flex flex-wrap gap-2">
                {commonTitles.map((title) => (
                  <button
                    key={title}
                    onClick={() => toggleArrayItem('titles', title)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      criteria.titles.includes(title)
                        ? 'bg-brand-gold text-white'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Locations
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {criteria.locations.map((loc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-brand-gold/10 text-brand-gold-dark rounded-full text-sm"
                  >
                    {loc}
                    <button onClick={() => removeFromArray('locations', i)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Texas, California, New York"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    addToArray('locations', newLocation, setNewLocation)
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() => addToArray('locations', newLocation, setNewLocation)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Industries */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Industries / Verticals
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {criteria.industries.map((ind, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-brand-gold/10 text-brand-gold-dark rounded-full text-sm"
                  >
                    {ind}
                    <button onClick={() => removeFromArray('industries', i)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Data Centers, Cloud Infrastructure, Real Estate"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    addToArray('industries', newIndustry, setNewIndustry)
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() => addToArray('industries', newIndustry, setNewIndustry)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Specific Companies */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Specific Companies (optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {criteria.companies.map((comp, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-brand-gold/10 text-brand-gold-dark rounded-full text-sm"
                  >
                    {comp}
                    <button onClick={() => removeFromArray('companies', i)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., AWS, Equinix, Digital Realty"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    addToArray('companies', newCompany, setNewCompany)
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() => addToArray('companies', newCompany, setNewCompany)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Max URLs to scrape */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                URLs to Scrape
              </label>
              <div className="flex items-center gap-4">
                <select
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
                  value={criteria.maxUrls}
                  onChange={(e) =>
                    setCriteria((prev) => ({ ...prev, maxUrls: parseInt(e.target.value) }))
                  }
                >
                  <option value={5}>5 URLs</option>
                  <option value={10}>10 URLs</option>
                  <option value={15}>15 URLs</option>
                  <option value={20}>20 URLs</option>
                  <option value={30}>30 URLs</option>
                  <option value={50}>50 URLs</option>
                </select>
                <span className="text-xs text-text-muted">
                  More URLs = more prospects, but takes longer
                </span>
              </div>
            </div>

            {/* Tag with Events */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Calendar className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Tag with Events (optional)
              </label>
              <p className="text-xs text-text-muted mb-3">
                Found prospects will be automatically added to selected events as Attendees
              </p>
              {events.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedEventIds.includes(event.id)
                          ? 'bg-brand-gold text-white'
                          : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                      }`}
                    >
                      {selectedEventIds.includes(event.id) && (
                        <Check className="w-3 h-3" />
                      )}
                      <span>{event.name}</span>
                      <span className="text-xs opacity-70">
                        {event.location_city}, {event.location_state}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted italic">No upcoming events available</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleSubmit}
                loading={startResearch.isPending}
              >
                <Sparkles className="w-4 h-4" />
                Start Research
              </Button>
            </div>
          </>
        ) : (
          /* Progress View */
          <div className="py-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center">
                  <CurrentStageIcon className="w-8 h-8 text-brand-gold animate-pulse" />
                </div>
                {progress.stage !== 'complete' && (
                  <div className="absolute inset-0 rounded-full border-2 border-brand-gold/30 border-t-brand-gold animate-spin" />
                )}
              </div>

              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {stageLabels[progress.stage]}
              </h3>
              <p className="text-sm text-text-secondary mb-6">{progress.message}</p>

              {(progress.urlsFound || progress.prospectsFound !== undefined || progress.totalExtracted) && (
                <div className="flex gap-8 mb-6">
                  {progress.urlsFound && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-gold">
                        {progress.urlsFound}
                      </div>
                      <div className="text-xs text-text-muted">Sources Analyzed</div>
                    </div>
                  )}
                  {/* Show total extracted during progress, or both at completion */}
                  {progress.stage === 'complete' ? (
                    <>
                      {progress.totalExtracted !== undefined && progress.totalExtracted > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-text-secondary">
                            {progress.totalExtracted}
                          </div>
                          <div className="text-xs text-text-muted">Total Found</div>
                        </div>
                      )}
                      {progress.prospectsFound !== undefined && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-brand-gold">
                            {progress.prospectsFound}
                          </div>
                          <div className="text-xs text-text-muted">New Prospects</div>
                        </div>
                      )}
                      {progress.duplicatesSkipped !== undefined && progress.duplicatesSkipped > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-text-muted">
                            {progress.duplicatesSkipped}
                          </div>
                          <div className="text-xs text-text-muted">Duplicates</div>
                        </div>
                      )}
                    </>
                  ) : (
                    progress.prospectsFound !== undefined && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-gold">
                          {progress.prospectsFound}
                        </div>
                        <div className="text-xs text-text-muted">Prospects Found</div>
                      </div>
                    )
                  )}
                </div>
              )}

              {progress.progress !== undefined && (
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-gold transition-all duration-500"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    {progress.progress}% complete
                  </p>
                </div>
              )}

              {progress.stage === 'complete' && (
                <div className="mt-6 flex flex-col gap-4">
                  {/* Show selected events and add to events button */}
                  {selectedEventIds.length > 0 && foundProspectIds.length > 0 && (
                    <div className="p-4 bg-surface-secondary rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-brand-gold" />
                        <span className="text-sm font-medium text-text-primary">
                          Add to Events
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mb-3">
                        Add {foundProspectIds.length} found prospects to {selectedEventIds.length} selected event{selectedEventIds.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {selectedEventIds.map(eventId => {
                          const event = events.find(e => e.id === eventId)
                          return event ? (
                            <span key={eventId} className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold-dark rounded-full text-xs">
                              {event.name}
                            </span>
                          ) : null
                        })}
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        loading={isAddingToEvents}
                        onClick={async () => {
                          setIsAddingToEvents(true)
                          try {
                            let totalAdded = 0
                            for (const eventId of selectedEventIds) {
                              const result = await eventsApi.bulkAddProspects(eventId, {
                                prospect_ids: foundProspectIds,
                                target_role: 'Attendee',
                                status: 'Identified',
                              })
                              totalAdded += result.data.added
                            }
                            toast.success(`Added prospects to ${selectedEventIds.length} event${selectedEventIds.length > 1 ? 's' : ''}!`)
                            queryClient.invalidateQueries({ queryKey: ['events'] })
                          } catch {
                            toast.error('Failed to add prospects to events')
                          } finally {
                            setIsAddingToEvents(false)
                          }
                        }}
                      >
                        <Calendar className="w-4 h-4" />
                        Add to {selectedEventIds.length} Event{selectedEventIds.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="gold"
                      onClick={() => {
                        onClose()
                        navigate('/prospects')
                      }}
                    >
                      View Prospects
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        setIsSaving(true)
                        try {
                          await scrapersApi.create({
                            name: `AI Research: ${criteria.description?.slice(0, 30) || criteria.companyTypes.join(', ') || 'Custom Search'}`,
                            type: 'ai_research',
                            description: buildQuery(),
                            config: {
                              keywords: [buildQuery()],
                            } as Record<string, unknown>,
                            is_active: true,
                          })
                          toast.success('Saved as scraper! You can run it again from the Research page.')
                        } catch {
                          toast.error('Failed to save scraper')
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                      loading={isSaving}
                    >
                      <Save className="w-4 h-4" />
                      Save as Scraper
                    </Button>
                  </div>
                  <button
                    className="text-sm text-text-muted hover:text-text-secondary"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
