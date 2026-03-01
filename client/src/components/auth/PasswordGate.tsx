import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import Button from '@/components/ui/Button'

const APP_PASSWORD = 'papi'
const AUTH_KEY = 'ccc-intel-auth'

interface PasswordGateProps {
  children: React.ReactNode
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check if already authenticated
  useEffect(() => {
    const auth = localStorage.getItem(AUTH_KEY)
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.toLowerCase() === APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true')
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-gold/10 rounded-full mb-4">
            <img src="/logo.svg" alt="CCC" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">CCC Intel</h1>
          <p className="text-text-muted mt-1">Contractors Closers & Connections</p>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-brand-gold" />
            <span className="font-medium text-text-primary">Enter Password</span>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="Password"
            autoFocus
            className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-colors ${
              error ? 'border-red-500 bg-red-50' : 'border-border'
            }`}
          />

          {error && (
            <p className="text-red-600 text-sm mt-2">Incorrect password. Please try again.</p>
          )}

          <Button type="submit" className="w-full mt-4">
            Access CCC Intel
          </Button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          Contact your CCC administrator for access
        </p>
      </div>
    </div>
  )
}
