import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Filter, Loader2 } from 'lucide-react'
import { prospectsApi, enrichmentApi, exportApi } from '@/lib/api'
import type { Prospect } from '@/types'
import { useAppStore } from '@/stores/app'
import ProspectsTable from './ProspectsTable'
import ProspectCardGrid from './ProspectCardGrid'
import FiltersPanel from './FiltersPanel'
import DetailPanel from './DetailPanel'
import BulkActions from './BulkActions'
import ProspectsHeader from './ProspectsHeader'
import Sheet from '@/components/ui/Sheet'

export default function ProspectsPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const {
    filters,
    sort,
    selectedProspectIds,
    selectProspect,
    deselectProspect,
    clearSelection,
    filtersPanelOpen,
    detailPanelProspectId,
    closeDetailPanel,
    openDetailPanel,
  } = useAppStore()

  // Check for openProspectId in navigation state (from global search)
  useEffect(() => {
    const state = location.state as { openProspectId?: string } | null
    if (state?.openProspectId) {
      openDetailPanel(state.openProspectId)
      // Clear the state so it doesn't reopen on subsequent renders
      window.history.replaceState({}, document.title)
    }
  }, [location.state, openDetailPanel])

  // Mobile filters sheet state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Fetch prospects
  const {
    data: prospectsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['prospects', filters, sort],
    queryFn: () =>
      prospectsApi.list({
        page: 1,
        per_page: 1000, // Load all for virtual scrolling
        filters,
        sort_by: sort.column || undefined,
        sort_dir: sort.direction,
      }),
  })

  // Fetch selected prospect for detail panel
  const { data: selectedProspect, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['prospect', detailPanelProspectId],
    queryFn: () =>
      detailPanelProspectId
        ? prospectsApi.get(detailPanelProspectId)
        : Promise.resolve(null),
    enabled: !!detailPanelProspectId,
  })

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: ({
      ids,
      status,
    }: {
      ids: string[]
      status: Prospect['status']
    }) => prospectsApi.bulkUpdateStatus(ids, status),
    onSuccess: (data) => {
      toast.success(`Updated ${data.data.updated} prospects`)
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      clearSelection()
    },
    onError: () => {
      toast.error('Failed to update prospects')
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => prospectsApi.bulkDelete(ids),
    onSuccess: (data) => {
      toast.success(`Deleted ${data.data.deleted} prospects`)
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      clearSelection()
    },
    onError: () => {
      toast.error('Failed to delete prospects')
    },
  })

  // Single prospect delete mutation
  const deleteProspectMutation = useMutation({
    mutationFn: (id: string) => prospectsApi.delete(id),
    onSuccess: () => {
      toast.success('Prospect deleted')
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      closeDetailPanel()
    },
    onError: () => {
      toast.error('Failed to delete prospect')
    },
  })

  // Single prospect status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Prospect['status'] }) =>
      prospectsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['prospect'] })
    },
    onError: () => {
      toast.error('Failed to update status')
    },
  })

  // Single prospect enrich mutation
  const enrichProspectMutation = useMutation({
    mutationFn: (id: string) =>
      enrichmentApi.run({ prospect_ids: [id], batch_size: 1 }),
    onSuccess: (_data, id) => {
      toast.success('Enrichment started')
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      queryClient.invalidateQueries({ queryKey: ['prospect', id] })
    },
    onError: () => {
      toast.error('Failed to start enrichment')
    },
  })

  // Handler functions for context menu actions
  const handleEnrich = useCallback(
    (prospectId: string) => {
      enrichProspectMutation.mutate(prospectId)
    },
    [enrichProspectMutation]
  )

  const handleDelete = useCallback(
    (prospectId: string) => {
      if (window.confirm('Are you sure you want to delete this prospect?')) {
        deleteProspectMutation.mutate(prospectId)
      }
    },
    [deleteProspectMutation]
  )

  const handleUpdateStatus = useCallback(
    (prospectId: string, status: string) => {
      updateStatusMutation.mutate({ id: prospectId, status: status as Prospect['status'] })
    },
    [updateStatusMutation]
  )

  const handleExport = useCallback(
    async (prospectId: string) => {
      try {
        const result = await exportApi.create({
          format: 'csv',
          filters: { ids: [prospectId] },
          name: 'Single Prospect Export',
        })
        window.open(exportApi.download(result.data.export_id), '_blank')
        toast.success('Export started')
      } catch {
        toast.error('Failed to export prospect')
      }
    },
    []
  )

  // Clear selection when filters change
  useEffect(() => {
    clearSelection()
  }, [filters, clearSelection])

  const prospects = prospectsData?.data ?? []
  const total = prospectsData?.total ?? 0

  // Count active filters for badge
  const activeFilterCount =
    filters.verticals.length +
    filters.target_roles.length +
    filters.company_types.length +
    filters.statuses.length +
    (filters.score_min > 0 || filters.score_max < 100 ? 1 : 0)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header with search and actions */}
      <ProspectsHeader total={total} loading={isLoading || isFetching} />

      {/* Bulk actions bar (shown when items selected) */}
      <AnimatePresence>
        {selectedProspectIds.size > 0 && (
          <BulkActions
            selectedCount={selectedProspectIds.size}
            onStatusChange={(status) =>
              bulkStatusMutation.mutate({
                ids: Array.from(selectedProspectIds),
                status: status as Prospect['status'],
              })
            }
            onDelete={() =>
              bulkDeleteMutation.mutate(Array.from(selectedProspectIds))
            }
            loading={bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filters panel - Desktop only (hidden on mobile) */}
        <AnimatePresence>
          {filtersPanelOpen && (
            <div className="hidden lg:block">
              <FiltersPanel />
            </div>
          )}
        </AnimatePresence>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop: Table view */}
          <div className="hidden lg:block h-full">
            <ProspectsTable
              prospects={prospects}
              loading={isLoading}
              total={total}
              onEnrich={handleEnrich}
              onExport={handleExport}
              onDelete={handleDelete}
              onUpdateStatus={handleUpdateStatus}
            />
          </div>

          {/* Mobile/Tablet: Card grid view */}
          <div className="lg:hidden h-full overflow-y-auto">
            <ProspectCardGrid
              prospects={prospects}
              selectedIds={selectedProspectIds}
              onSelect={selectProspect}
              onDeselect={deselectProspect}
              onOpenDetail={openDetailPanel}
              onEnrich={handleEnrich}
              onDelete={handleDelete}
              loading={isLoading}
            />
          </div>
        </div>

        {/* Detail panel (slide from right) */}
        <AnimatePresence>
          {detailPanelProspectId && (
            isLoadingDetail ? (
              <div className="w-[400px] bg-white border-l border-border flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
                  <span className="text-sm">Loading prospect...</span>
                </div>
              </div>
            ) : selectedProspect?.data ? (
              <DetailPanel
                prospect={selectedProspect.data}
                onClose={closeDetailPanel}
              />
            ) : null
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Filter FAB */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 bg-brand-gold text-white rounded-full shadow-lg hover:bg-brand-gold-dark transition-colors"
      >
        <Filter className="w-5 h-5" />
        <span className="font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-brand-gold rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile Filters Sheet */}
      <Sheet
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filters"
        side="bottom"
      >
        <FiltersPanel variant="sheet" onApply={() => setMobileFiltersOpen(false)} />
      </Sheet>
    </div>
  )
}
