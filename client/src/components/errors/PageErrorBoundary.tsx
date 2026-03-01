import { ErrorBoundary } from './ErrorBoundary'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import type { ReactNode, ErrorInfo } from 'react'

interface PageErrorBoundaryProps {
  children: ReactNode
}

/**
 * Page-level error boundary with full-page fallback UI
 */
export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to error reporting service
    console.error('Page error:', error, errorInfo)
  }

  return (
    <ErrorBoundary fallback={<PageErrorFallback />} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}

function PageErrorFallback() {
  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8"
    >
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-12 w-12 text-red-600" aria-hidden="true" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Page Error</h1>
        <p className="mb-8 text-gray-600">
          We're sorry, but something went wrong loading this page. Our team has been notified.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reload Page
          </button>

          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default PageErrorBoundary
