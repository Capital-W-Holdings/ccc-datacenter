import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: 'search' | 'none'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon = 'none', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon === 'search' && (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold',
              'disabled:bg-surface-secondary disabled:cursor-not-allowed',
              error && 'border-red-500 focus:ring-red-500/30 focus:border-red-500',
              icon === 'search' && 'pl-10',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-text-muted">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input
