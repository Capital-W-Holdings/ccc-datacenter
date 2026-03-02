import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { WebSocketProvider } from './providers/WebSocketProvider'
import App from './App'
import './styles/globals.css'

// Build info - helps verify correct env vars are baked in
console.log('[CCC Build] API URL:', import.meta.env.VITE_API_URL)
console.log('[CCC Build] WS URL:', import.meta.env.VITE_WS_URL)
console.log('[CCC Build] Build time:', '2026-03-02T11:50:00Z')
console.log('[CCC Build] Mode:', import.meta.env.MODE)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '8px',
            },
            success: {
              iconTheme: {
                primary: '#e67e22',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
