import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component for catching and handling React errors
 * Provides a fallback UI and optional error reporting
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset?: () => void
  title?: string
  message?: string
}

/**
 * Default error fallback UI
 */
export function ErrorFallback({
  error,
  onReset,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center"
    >
      <AlertTriangle className="mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 max-w-md text-gray-600">{message}</p>

      {error && import.meta.env.DEV && (
        <details className="mb-4 max-w-full overflow-auto rounded bg-gray-100 p-4 text-left text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Error Details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-red-600">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}

      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
      )}
    </div>
  )
}

export default ErrorBoundary
