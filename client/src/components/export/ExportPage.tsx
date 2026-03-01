import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FileSpreadsheet,
  FileText,
  FileType,
  Download,
  Clock,
  CheckCircle,
} from 'lucide-react'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { exportApi } from '@/lib/api'
import { useAppStore } from '@/stores/app'
import { cn, formatDateTime } from '@/lib/utils'

const exportFormats = [
  {
    id: 'xlsx',
    name: 'Excel Workbook',
    description: 'Multi-sheet export with CCC branding',
    icon: FileSpreadsheet,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    id: 'csv',
    name: 'CSV File',
    description: 'Simple flat export for CRM import',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Branded summary with top prospects',
    icon: FileType,
    color: 'text-red-600 bg-red-50',
  },
] as const

const defaultColumns = [
  { key: 'full_name', label: 'Full Name', default: true },
  { key: 'title', label: 'Title', default: true },
  { key: 'company', label: 'Company', default: true },
  { key: 'company_type', label: 'Company Type', default: true },
  { key: 'ccc_verticals', label: 'CCC Verticals', default: true },
  { key: 'target_roles', label: 'Target Roles', default: true },
  { key: 'relevance_score', label: 'Relevance Score', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'phone', label: 'Phone', default: false },
  { key: 'linkedin_url', label: 'LinkedIn URL', default: true },
  { key: 'location_city', label: 'City', default: true },
  { key: 'location_state', label: 'State', default: true },
  { key: 'ai_summary', label: 'AI Summary', default: false },
  { key: 'notes', label: 'Notes', default: false },
]

export default function ExportPage() {
  const { filters } = useAppStore()
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    defaultColumns.filter((c) => c.default).map((c) => c.key),
  )
  const [applyFilters, setApplyFilters] = useState(true)

  // Fetch export history
  const { data: historyResponse, refetch: refetchHistory } = useQuery({
    queryKey: ['export', 'history'],
    queryFn: exportApi.getHistory,
  })

  // Create export mutation
  const exportMutation = useMutation({
    mutationFn: () =>
      exportApi.create({
        format: selectedFormat,
        filters: applyFilters ? filters : undefined,
        columns: selectedColumns,
      }),
    onSuccess: (data) => {
      toast.success('Export generated!')
      // Trigger download
      window.open(data.data.download_url, '_blank')
      refetchHistory()
    },
    onError: () => {
      toast.error('Failed to generate export')
    },
  })

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const history = historyResponse?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary heading-gold-accent">
          Export Center
        </h2>
        <p className="text-text-secondary mt-1">
          Generate professional exports of your prospect data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Wizard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format Selection */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>1. Select Format</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-3 gap-4">
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    selectedFormat === format.id
                      ? 'border-brand-gold bg-brand-gold/5'
                      : 'border-border hover:border-brand-gold/50',
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                      format.color,
                    )}
                  >
                    <format.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-text-primary">{format.name}</h4>
                  <p className="text-sm text-text-muted mt-1">
                    {format.description}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          {/* Column Selection */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>2. Select Columns</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {defaultColumns.map((col) => (
                <Checkbox
                  key={col.key}
                  label={col.label}
                  checked={selectedColumns.includes(col.key)}
                  onChange={() => toggleColumn(col.key)}
                />
              ))}
            </div>
          </Card>

          {/* Filter Options */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>3. Apply Filters</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <Checkbox
                label="Apply current filters to export"
                checked={applyFilters}
                onChange={(e) => setApplyFilters(e.target.checked)}
              />
              {applyFilters && (
                <div className="p-3 bg-surface-secondary rounded-lg text-sm">
                  <p className="text-text-secondary">
                    Export will include only prospects matching your current
                    filter settings.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Generate Button */}
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            onClick={() => exportMutation.mutate()}
            loading={exportMutation.isPending}
          >
            <Download className="w-5 h-5" />
            Generate Export
          </Button>
        </div>

        {/* Export History */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Export History</CardTitle>
          </CardHeader>

          {history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted">No exports yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg"
                >
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {record.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDateTime(record.created_at)} • {record.record_count}{' '}
                      records
                    </p>
                  </div>
                  <a
                    href={exportApi.download(record.id)}
                    className="p-2 rounded-lg text-text-muted hover:text-brand-gold hover:bg-brand-gold/10 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
