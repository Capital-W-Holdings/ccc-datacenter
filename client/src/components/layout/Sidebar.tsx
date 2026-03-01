import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Search,
  Sparkles,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/prospects', icon: Users, label: 'Prospects' },
  { to: '/events', icon: Calendar, label: 'Events' },
  { to: '/research', icon: Search, label: 'Research' },
  { to: '/enrichment', icon: Sparkles, label: 'Enrichment' },
  { to: '/export', icon: Download, label: 'Export' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, closeMobileMenu } = useAppStore()
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu()
  }, [location.pathname, closeMobileMenu])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        closeMobileMenu()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen, closeMobileMenu])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Render sidebar content - isMobile controls whether labels are always shown
  const renderSidebarContent = (isMobile: boolean = false) => {
    const showLabels = isMobile || !sidebarCollapsed

    return (
      <>
        {/* Logo */}
        <div className="h-20 flex items-center justify-center px-3 py-3 border-b border-border">
          {isMobile || !sidebarCollapsed ? (
            <img
              src="/logo-full.svg?v=1"
              alt="Contractors Closers & Connections"
              className="h-14 w-auto flex-shrink-0"
            />
          ) : (
            <img
              src="/logo.svg?v=3"
              alt="CCC"
              className="h-10 w-auto flex-shrink-0"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-brand-gold/10 text-brand-gold-dark'
                    : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId={isMobile ? 'sidebar-indicator-mobile' : 'sidebar-indicator'}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-gold rounded-r"
                  />
                )}

                <item.icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive ? 'text-brand-gold' : 'text-text-muted group-hover:text-text-secondary',
                  )}
                />

                {showLabels && (
                  <span className="font-medium whitespace-nowrap">{item.label}</span>
                )}

                {/* Tooltip for collapsed state - desktop only */}
                {!isMobile && sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-text-primary text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        {!isMobile && (
          <div className="p-4 border-t border-border">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-border flex-col transition-all duration-300 z-40',
          'hidden lg:flex', // Only show on large screens
          sidebarCollapsed ? 'w-20' : 'w-64',
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={closeMobileMenu}
            />

            {/* Mobile sidebar drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-border flex flex-col z-50 lg:hidden"
            >
              {/* Mobile close button */}
              <button
                onClick={closeMobileMenu}
                className="absolute top-4 right-4 p-2 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
