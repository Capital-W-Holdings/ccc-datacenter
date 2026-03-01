import type { ReactNode, HTMLAttributes } from 'react'

interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
}

/**
 * Visually hides content while keeping it accessible to screen readers
 * Use for additional context that only screen reader users need
 */
export function VisuallyHidden({ children, ...props }: VisuallyHiddenProps) {
  return (
    <span className="sr-only" {...props}>
      {children}
    </span>
  )
}

export default VisuallyHidden
