import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { QueryErrorBoundary } from './components/errors/QueryErrorBoundary'
import LoadingSkeleton from './components/common/LoadingSkeleton'
import CommandPalette, { useCommandPalette } from './components/common/CommandPalette'
import PasswordGate from './components/auth/PasswordGate'

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const ProspectsPage = lazy(() => import('./components/prospects/ProspectsPage'))
const EventsPage = lazy(() => import('./components/events/EventsPage'))
const EventPipelinePage = lazy(() => import('./components/events/EventPipelinePage'))
const ResearchPage = lazy(() => import('./components/research/ResearchPage'))
const EnrichmentPage = lazy(() => import('./components/enrichment/EnrichmentPage'))
const ExportPage = lazy(() => import('./components/export/ExportPage'))
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'))
const NotFoundPage = lazy(() => import('./components/common/NotFoundPage'))

export default function App() {
  const commandPalette = useCommandPalette()
  const navigate = useNavigate()

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Skip if typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Ctrl/Cmd + E: Go to Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        navigate('/export')
      }

      // Ctrl/Cmd + N: Go to Research (to add new prospects via scrapers)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/research')
      }
    }

    document.addEventListener('keydown', handleGlobalShortcuts)
    return () => document.removeEventListener('keydown', handleGlobalShortcuts)
  }, [navigate])

  return (
    <PasswordGate>
      <ErrorBoundary>
        <AppShell>
          <Suspense fallback={<LoadingSkeleton />}>
            <QueryErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/prospects" element={<ProspectsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:eventId" element={<EventPipelinePage />} />
                <Route path="/research" element={<ResearchPage />} />
                <Route path="/enrichment" element={<EnrichmentPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </QueryErrorBoundary>
          </Suspense>
          <CommandPalette
            isOpen={commandPalette.isOpen}
            onClose={commandPalette.close}
          />
        </AppShell>
      </ErrorBoundary>
    </PasswordGate>
  )
}
