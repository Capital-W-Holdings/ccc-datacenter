import { create } from 'zustand'
import type { ProspectFilters, SortState, Prospect } from '@/types'

interface AppState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Mobile menu
  mobileMenuOpen: boolean
  openMobileMenu: () => void
  closeMobileMenu: () => void
  toggleMobileMenu: () => void

  // Selected prospects for bulk actions
  selectedProspectIds: Set<string>
  selectProspect: (id: string) => void
  deselectProspect: (id: string) => void
  selectAllProspects: (ids: string[]) => void
  clearSelection: () => void

  // Detail panel
  detailPanelProspectId: string | null
  openDetailPanel: (id: string) => void
  closeDetailPanel: () => void

  // Filters panel
  filtersPanelOpen: boolean
  openFiltersPanel: () => void
  closeFiltersPanel: () => void

  // Prospect filters
  filters: ProspectFilters
  setFilters: (filters: Partial<ProspectFilters>) => void
  resetFilters: () => void

  // Sorting
  sort: SortState
  setSort: (column: keyof Prospect | null, direction?: 'asc' | 'desc') => void

  // Active scrape job
  activeScraperJobId: string | null
  setActiveScraperJob: (jobId: string | null) => void

  // Active enrichment job
  activeEnrichmentJobId: string | null
  setActiveEnrichmentJob: (jobId: string | null) => void
}

const defaultFilters: ProspectFilters = {
  search: '',
  verticals: [],
  target_roles: [],
  company_types: [],
  statuses: [],
  score_min: 0,
  score_max: 100,
  sources: [],
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Mobile menu
  mobileMenuOpen: false,
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  toggleMobileMenu: () =>
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  // Selected prospects
  selectedProspectIds: new Set(),
  selectProspect: (id) =>
    set((state) => ({
      selectedProspectIds: new Set([...state.selectedProspectIds, id]),
    })),
  deselectProspect: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedProspectIds)
      newSet.delete(id)
      return { selectedProspectIds: newSet }
    }),
  selectAllProspects: (ids) =>
    set({ selectedProspectIds: new Set(ids) }),
  clearSelection: () => set({ selectedProspectIds: new Set() }),

  // Detail panel
  detailPanelProspectId: null,
  openDetailPanel: (id) => set({ detailPanelProspectId: id }),
  closeDetailPanel: () => set({ detailPanelProspectId: null }),

  // Filters panel
  filtersPanelOpen: false,
  openFiltersPanel: () => set({ filtersPanelOpen: true }),
  closeFiltersPanel: () => set({ filtersPanelOpen: false }),

  // Filters
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),

  // Sort
  sort: { column: null, direction: 'asc' },
  setSort: (column, direction) =>
    set((state) => {
      if (column === state.sort.column && !direction) {
        // Toggle direction
        return {
          sort: {
            column,
            direction: state.sort.direction === 'asc' ? 'desc' : 'asc',
          },
        }
      }
      return {
        sort: { column, direction: direction || 'asc' },
      }
    }),

  // Scraper job
  activeScraperJobId: null,
  setActiveScraperJob: (jobId) => set({ activeScraperJobId: jobId }),

  // Enrichment job
  activeEnrichmentJobId: null,
  setActiveEnrichmentJob: (jobId) => set({ activeEnrichmentJobId: jobId }),
}))
