import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, User, Building2, Mail, Loader2, ArrowRight } from 'lucide-react'
import { prospectsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Prospect } from '@/types'
import { useAppStore } from '@/stores/app'

export default function GlobalSearch() {
  const navigate = useNavigate()
  const { setFilters, resetFilters } = useAppStore()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search query
  const { data, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () =>
      prospectsApi.list({
        page: 1,
        per_page: 8,
        filters: { search: query },
      }),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  const results = data?.data ?? []

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && query.length >= 2) {
        // Navigate to prospects page with search filter
        handleViewAll()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => (i < results.length ? i + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => (i > 0 ? i - 1 : results.length))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex === results.length) {
          handleViewAll()
        } else if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSelect = (prospect: Prospect) => {
    setIsOpen(false)
    setQuery('')
    // Navigate to prospects page with state to open detail panel
    navigate('/prospects', { state: { openProspectId: prospect.id } })
  }

  const handleViewAll = () => {
    setIsOpen(false)
    resetFilters()
    setFilters({ search: query })
    setQuery('')
    navigate('/prospects')
  }

  return (
    <div className="relative w-64">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search prospects..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(e.target.value.length >= 2)
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-colors"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          {results.length === 0 && !isLoading ? (
            <div className="p-4 text-center text-text-muted text-sm">
              No prospects found for "{query}"
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto">
                {results.map((prospect, index) => (
                  <button
                    key={prospect.id}
                    onClick={() => handleSelect(prospect)}
                    className={cn(
                      'w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-surface-secondary transition-colors',
                      selectedIndex === index && 'bg-surface-secondary'
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-brand-gold" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {prospect.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        {prospect.title && (
                          <span className="truncate max-w-[120px]">
                            {prospect.title}
                          </span>
                        )}
                        {prospect.title && prospect.company && (
                          <span className="text-border">•</span>
                        )}
                        {prospect.company && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3" />
                            {prospect.company}
                          </span>
                        )}
                      </div>
                      {prospect.email && (
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{prospect.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Target roles badges */}
                    <div className="flex gap-1 flex-shrink-0">
                      {prospect.target_roles.slice(0, 2).map((role) => (
                        <span
                          key={role}
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] font-medium rounded',
                            role === 'Attendee' && 'bg-blue-50 text-blue-600',
                            role === 'Sponsor' && 'bg-emerald-50 text-emerald-600',
                            role === 'Speaker' && 'bg-purple-50 text-purple-600'
                          )}
                        >
                          {role.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* View All */}
              {results.length > 0 && (
                <button
                  onClick={handleViewAll}
                  className={cn(
                    'w-full px-3 py-2.5 flex items-center justify-between text-sm font-medium text-brand-gold hover:bg-brand-gold/5 border-t border-border transition-colors',
                    selectedIndex === results.length && 'bg-brand-gold/5'
                  )}
                >
                  <span>View all results for "{query}"</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
