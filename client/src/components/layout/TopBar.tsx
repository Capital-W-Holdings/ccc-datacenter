import { useLocation } from 'react-router-dom'
import { Bell, HelpCircle, Menu, User } from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import { useAppStore } from '@/stores/app'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Command Center',
    description: 'Overview of your summit intelligence pipeline',
  },
  '/prospects': {
    title: 'Prospect Database',
    description: 'Browse and manage potential attendees, sponsors, and speakers',
  },
  '/events': {
    title: 'Events',
    description: 'Manage CCC events and track prospect pipelines',
  },
  '/research': {
    title: 'Research Engine',
    description: 'Configure and run data scrapers',
  },
  '/enrichment': {
    title: 'AI Enrichment',
    description: 'Enrich prospect data with AI-powered insights',
  },
  '/export': {
    title: 'Export Center',
    description: 'Generate reports and export data',
  },
  '/settings': {
    title: 'Settings',
    description: 'Configure your platform',
  },
}

export default function TopBar() {
  const location = useLocation()
  const { openMobileMenu } = useAppStore()
  const pageInfo = pageTitles[location.pathname] || {
    title: 'CCC Intel',
    description: '',
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left side - mobile menu + title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button - only visible on small screens */}
        <button
          onClick={openMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile logo - only visible on small screens */}
        <img
          src="/logo.svg"
          alt="CCC"
          className="lg:hidden w-8 h-8 flex-shrink-0 object-contain"
        />

        {/* Page title - show simplified on mobile */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {pageInfo.title}
          </h2>
          {pageInfo.description && (
            <p className="text-sm text-text-muted hidden md:block">{pageInfo.description}</p>
          )}
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Global search - hidden on mobile, shown on tablet+ */}
        <div className="hidden md:block">
          <GlobalSearch />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors">
          <Bell className="w-5 h-5" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-gold rounded-full" />
        </button>

        {/* Help - hidden on mobile */}
        <button className="hidden sm:block p-2 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User avatar placeholder */}
        <div className="w-9 h-9 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-500" />
        </div>
      </div>
    </header>
  )
}
