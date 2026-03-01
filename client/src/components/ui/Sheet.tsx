import { type ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  side?: 'bottom' | 'right'
}

export default function Sheet({
  isOpen,
  onClose,
  children,
  title,
  side = 'bottom',
}: SheetProps) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const variants = {
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={variants[side].initial}
            animate={variants[side].animate}
            exit={variants[side].exit}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 bg-white shadow-xl',
              side === 'bottom' && 'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]',
              side === 'right' && 'inset-y-0 right-0 w-80 max-w-full',
            )}
          >
            {/* Handle bar for bottom sheet */}
            {side === 'bottom' && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-surface-secondary" />
              </div>
            )}

            {/* Header */}
            {(title || side === 'right') && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                {title && (
                  <h3 className="text-lg font-semibold text-text-primary">
                    {title}
                  </h3>
                )}
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className={cn(
              'overflow-y-auto',
              side === 'bottom' && 'max-h-[calc(85vh-4rem)]',
              side === 'right' && 'h-[calc(100%-3.5rem)]',
            )}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
