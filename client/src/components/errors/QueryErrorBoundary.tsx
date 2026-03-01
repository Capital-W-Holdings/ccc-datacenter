import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary, ErrorFallback } from './ErrorBoundary'
import type { ReactNode } from 'react'

interface QueryErrorBoundaryProps {
  children: ReactNode
}

/**
 * Error boundary specifically for TanStack Query errors
 * Automatically resets queries when user clicks retry
 */
export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          error={null}
          onReset={reset}
          title="Failed to load data"
          message="We couldn't fetch the data you requested. Please check your connection and try again."
        />
      }
      onError={() => {
        // Could log to error reporting service here
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export default QueryErrorBoundary
