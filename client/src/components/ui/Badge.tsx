import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import type { ProspectStatus, CCCVertical, TargetRole, CompanyType } from '@/types'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'status'
    | 'vertical'
    | 'role'
    | 'company'
    | 'score'
    | 'gold'
  status?: ProspectStatus
  vertical?: CCCVertical
  role?: TargetRole
  companyType?: CompanyType
  score?: number
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      status,
      vertical,
      role,
      companyType,
      score,
      children,
      ...props
    },
    ref,
  ) => {
    const getStatusStyles = (s: ProspectStatus) => {
      const styles: Record<ProspectStatus, string> = {
        New: 'bg-blue-50 text-blue-700 border-blue-200',
        Qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Contacted: 'bg-purple-50 text-purple-700 border-purple-200',
        Engaged: 'bg-amber-50 text-amber-700 border-amber-200',
        Nurturing: 'bg-sky-50 text-sky-700 border-sky-200',
        Archived: 'bg-slate-50 text-slate-700 border-slate-200',
      }
      return styles[s]
    }

    const getVerticalStyles = (v: CCCVertical) => {
      const styles: Record<CCCVertical, string> = {
        Development: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        Investment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Brokerage: 'bg-orange-50 text-orange-700 border-orange-200',
        Management: 'bg-sky-50 text-sky-700 border-sky-200',
        Construction: 'bg-slate-100 text-slate-700 border-slate-200',
      }
      return styles[v]
    }

    const getRoleStyles = (r: TargetRole) => {
      const styles: Record<TargetRole, string> = {
        Attendee: 'bg-gray-100 text-gray-700 border-gray-200',
        Sponsor: 'bg-brand-gold/10 text-brand-gold-dark border-brand-gold/30',
        Speaker: 'bg-blue-50 text-blue-700 border-blue-200',
      }
      return styles[r]
    }

    const getScoreStyles = (s: number) => {
      if (s >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      if (s >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
      return 'bg-red-50 text-red-700 border-red-200'
    }

    let variantStyles = 'bg-gray-100 text-gray-700 border-gray-200'

    if (variant === 'status' && status) {
      variantStyles = getStatusStyles(status)
    } else if (variant === 'vertical' && vertical) {
      variantStyles = getVerticalStyles(vertical)
    } else if (variant === 'role' && role) {
      variantStyles = getRoleStyles(role)
    } else if (variant === 'score' && score !== undefined) {
      variantStyles = getScoreStyles(score)
    } else if (variant === 'gold') {
      variantStyles = 'bg-brand-gold/10 text-brand-gold-dark border-brand-gold/30'
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
          variantStyles,
          className,
        )}
        {...props}
      >
        {children || status || vertical || role || companyType || score}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

export default Badge
