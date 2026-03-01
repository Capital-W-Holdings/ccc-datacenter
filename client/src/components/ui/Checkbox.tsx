import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, onChange, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-4 h-4 rounded border border-border bg-white transition-all duration-200',
              'peer-checked:bg-brand-gold peer-checked:border-brand-gold',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold/30',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              className,
            )}
          >
            <Check
              className={cn(
                'w-3 h-3 text-white absolute top-0.5 left-0.5 transition-opacity duration-200',
                checked ? 'opacity-100' : 'opacity-0',
              )}
              strokeWidth={3}
            />
          </div>
        </div>
        {label && (
          <span className="text-sm text-text-primary select-none">{label}</span>
        )}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
