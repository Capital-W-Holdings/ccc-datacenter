import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, onChange, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex items-center gap-3 cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-10 h-6 rounded-full transition-all duration-200',
              'bg-surface-secondary peer-checked:bg-brand-gold',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold/30',
              className,
            )}
          />
          <div
            className={cn(
              'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
              'peer-checked:translate-x-4',
            )}
          />
        </div>
        {label && (
          <span className="text-sm text-text-primary select-none">{label}</span>
        )}
      </label>
    )
  },
)

Switch.displayName = 'Switch'

export default Switch
