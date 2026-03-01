import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Key, Building2, Save, Trash2, Plus, Eye, EyeOff, Database, RefreshCw, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Progress from '@/components/ui/Progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { settingsApi, targetCompaniesApi, hunterApi } from '@/lib/api'
import type { AppSettings, TargetCompany } from '@/types'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showHunterKey, setShowHunterKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [hunterKey, setHunterKey] = useState('')
  const [newCompany, setNewCompany] = useState({ name: '', category: '', website: '' })

  // Fetch settings
  const { data: settingsResponse } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  // Fetch target companies
  const { data: companiesResponse } = useQuery({
    queryKey: ['target-companies'],
    queryFn: targetCompaniesApi.list,
  })

  // Fetch Hunter.io quota
  const { data: hunterQuotaResponse, refetch: refetchQuota } = useQuery({
    queryKey: ['hunter-quota'],
    queryFn: hunterApi.getQuota,
    refetchInterval: 60000, // Refresh every minute
  })

  // Fetch Hunter.io cache stats
  const { data: hunterCacheResponse, refetch: refetchCache } = useQuery({
    queryKey: ['hunter-cache-stats'],
    queryFn: hunterApi.getCacheStats,
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<AppSettings>) => settingsApi.update(settings),
    onSuccess: () => {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      toast.error('Failed to save settings')
    },
  })

  // Add company mutation
  const addCompanyMutation = useMutation({
    mutationFn: (company: Omit<TargetCompany, 'id'>) =>
      targetCompaniesApi.create(company),
    onSuccess: () => {
      toast.success('Company added')
      queryClient.invalidateQueries({ queryKey: ['target-companies'] })
      setNewCompany({ name: '', category: '', website: '' })
    },
    onError: () => {
      toast.error('Failed to add company')
    },
  })

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: (id: string) => targetCompaniesApi.delete(id),
    onSuccess: () => {
      toast.success('Company removed')
      queryClient.invalidateQueries({ queryKey: ['target-companies'] })
    },
    onError: () => {
      toast.error('Failed to remove company')
    },
  })

  // Clear Hunter cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: hunterApi.clearCache,
    onSuccess: (data) => {
      toast.success(`Cache cleared (${data.data.deleted} entries)`)
      queryClient.invalidateQueries({ queryKey: ['hunter-cache-stats'] })
    },
    onError: () => {
      toast.error('Failed to clear cache')
    },
  })

  // Set initial API keys
  useEffect(() => {
    if (settingsResponse?.data.anthropic_api_key) {
      setApiKey(settingsResponse.data.anthropic_api_key)
    }
    if (settingsResponse?.data.hunter_api_key) {
      setHunterKey(settingsResponse.data.hunter_api_key)
    }
  }, [settingsResponse])

  const settings = settingsResponse?.data
  const companies = companiesResponse?.data ?? []

  // Group companies by category
  const companiesByCategory = companies.reduce(
    (acc, company) => {
      const cat = company.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(company)
      return acc
    },
    {} as Record<string, TargetCompany[]>,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary heading-gold-accent">
          Settings
        </h2>
        <p className="text-text-secondary mt-1">
          Configure your platform and API integrations
        </p>
      </div>

      <Tabs defaultValue="api">
        <TabsList>
          <TabsTrigger value="api">API Configuration</TabsTrigger>
          <TabsTrigger value="companies">Target Companies</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* API Configuration */}
        <TabsContent value="api" className="mt-6 space-y-6">
          <Card padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-brand-gold" />
                Anthropic API Key
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Enter your Anthropic API key to enable AI-powered enrichment.
                Get your key from{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-ant-api..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  variant="gold"
                  onClick={() =>
                    updateSettingsMutation.mutate({ anthropic_api_key: apiKey })
                  }
                  loading={updateSettingsMutation.isPending}
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </div>

              {settings?.anthropic_api_key && (
                <p className="text-sm text-emerald-600">
                  API key configured and ready to use
                </p>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-brand-gold" />
                Hunter.io API Key
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Enter your Hunter.io API key to find verified email addresses for prospects.
                Get your key from{' '}
                <a
                  href="https://hunter.io/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:underline"
                >
                  hunter.io
                </a>
              </p>

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    type={showHunterKey ? 'text' : 'password'}
                    placeholder="Enter your Hunter.io API key..."
                    value={hunterKey}
                    onChange={(e) => setHunterKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowHunterKey(!showHunterKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showHunterKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  variant="gold"
                  onClick={() =>
                    updateSettingsMutation.mutate({ hunter_api_key: hunterKey })
                  }
                  loading={updateSettingsMutation.isPending}
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </div>

              {settings?.hunter_api_key && (
                <p className="text-sm text-emerald-600">
                  Hunter.io API key configured - emails will be found during research
                </p>
              )}
            </div>
          </Card>

          {/* Hunter.io Quota & Stats */}
          {hunterQuotaResponse?.data.configured && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quota Card */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-brand-gold" />
                    API Quota
                  </CardTitle>
                </CardHeader>

                <div className="space-y-4">
                  {hunterQuotaResponse.data.quota && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Used this month</span>
                        <span className="font-medium">
                          {hunterQuotaResponse.data.quota.used.toLocaleString()} / {hunterQuotaResponse.data.quota.limit.toLocaleString()}
                        </span>
                      </div>

                      <Progress
                        value={hunterQuotaResponse.data.quota.percentUsed}
                        variant={
                          hunterQuotaResponse.data.quota.percentUsed > 90
                            ? 'danger'
                            : hunterQuotaResponse.data.quota.percentUsed > 70
                              ? 'warning'
                              : 'success'
                        }
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {hunterQuotaResponse.data.quota.remaining > 100 ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-sm text-text-secondary">
                            {hunterQuotaResponse.data.quota.remaining.toLocaleString()} remaining
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refetchQuota()}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {hunterQuotaResponse.data.quota.resetAt && (
                        <p className="text-xs text-text-muted">
                          Resets: {new Date(hunterQuotaResponse.data.quota.resetAt).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </Card>

              {/* Cache Card */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-gold" />
                    Email Cache
                  </CardTitle>
                </CardHeader>

                <div className="space-y-4">
                  {hunterCacheResponse?.data && (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-text-secondary">Cached Lookups</span>
                          <p className="font-medium text-lg">{hunterCacheResponse.data.totalCached}</p>
                        </div>
                        <div>
                          <span className="text-text-secondary">Emails Found</span>
                          <p className="font-medium text-lg text-emerald-600">{hunterCacheResponse.data.withEmail}</p>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Cache hit rate</span>
                        <span className="font-medium">{hunterCacheResponse.data.hitRate}%</span>
                      </div>

                      <Progress value={hunterCacheResponse.data.hitRate} />

                      <div className="flex justify-between items-center pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refetchCache()}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          Refresh
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => clearCacheMutation.mutate()}
                          loading={clearCacheMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Clear Cache
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Target Companies */}
        <TabsContent value="companies" className="mt-6 space-y-6">
          {/* Add Company */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-gold" />
                Add Target Company
              </CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Company name"
                value={newCompany.name}
                onChange={(e) =>
                  setNewCompany((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                value={newCompany.category}
                onChange={(e) =>
                  setNewCompany((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                <option value="">Select category</option>
                <option value="Hyperscaler">Hyperscaler</option>
                <option value="Developer/Operator">Developer/Operator</option>
                <option value="Investor">Investor</option>
                <option value="Construction">Construction</option>
                <option value="Broker">Broker</option>
              </select>
              <Input
                placeholder="Website (optional)"
                value={newCompany.website}
                onChange={(e) =>
                  setNewCompany((prev) => ({ ...prev, website: e.target.value }))
                }
              />
              <Button
                variant="gold"
                onClick={() =>
                  addCompanyMutation.mutate({
                    name: newCompany.name,
                    category: newCompany.category as TargetCompany['category'],
                    website: newCompany.website || null,
                    priority: 5,
                  })
                }
                disabled={!newCompany.name || !newCompany.category}
                loading={addCompanyMutation.isPending}
              >
                Add Company
              </Button>
            </div>
          </Card>

          {/* Companies List */}
          {Object.entries(companiesByCategory).map(([category, categoryCompanies]) => (
            <Card key={category} padding="lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-gold" />
                  {category} ({categoryCompanies.length})
                </CardTitle>
              </CardHeader>

              <div className="flex flex-wrap gap-2">
                {categoryCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-lg group"
                  >
                    <span className="text-sm text-text-primary">
                      {company.name}
                    </span>
                    <button
                      onClick={() => deleteCompanyMutation.mutate(company.id)}
                      className="p-0.5 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="mt-6">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Export Preferences</CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Default Enrichment Batch Size
                </label>
                <select
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm w-48"
                  defaultValue={settings?.enrichment_batch_size || 25}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      enrichment_batch_size: parseInt(e.target.value),
                    })
                  }
                >
                  <option value="10">10 prospects</option>
                  <option value="25">25 prospects</option>
                  <option value="50">50 prospects</option>
                  <option value="100">100 prospects</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Scraping Delay (ms)
                </label>
                <Input
                  type="number"
                  min={1000}
                  max={10000}
                  defaultValue={settings?.scraping_delay_ms || 3000}
                  className="w-48"
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      scraping_delay_ms: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-text-muted mt-1">
                  Delay between requests to be polite to target sites (2000-5000
                  recommended)
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
