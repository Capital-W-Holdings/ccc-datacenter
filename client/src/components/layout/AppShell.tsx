import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1], // Smooth ease-out
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

export default function AppShell({ children }: AppShellProps) {
  const { sidebarCollapsed } = useAppStore()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          // No margin on mobile (< lg), sidebar is overlay
          'ml-0',
          // On large screens, apply sidebar margin
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        <TopBar />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-4 lg:p-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
