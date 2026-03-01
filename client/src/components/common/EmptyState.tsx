import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Search,
  Download,
  Database,
  Sparkles,
  FileText,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type EmptyStateType =
  | 'no-prospects'
  | 'no-results'
  | 'no-exports'
  | 'no-scrapers'
  | 'empty-queue'
  | 'no-activity'

interface EmptyStateProps {
  type: EmptyStateType
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  className?: string
}

const illustrations: Record<EmptyStateType, ReactNode> = {
  'no-prospects': (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-brand-gold/10 flex items-center justify-center">
        <Users className="w-12 h-12 text-brand-gold" />
      </div>
      <motion.div
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="text-lg">👋</span>
      </motion.div>
    </div>
  ),
  'no-results': (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
        <Search className="w-12 h-12 text-blue-500" />
      </div>
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <div className="w-32 h-32 border-4 border-dashed border-blue-200 rounded-full" />
      </motion.div>
    </div>
  ),
  'no-exports': (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center">
        <Download className="w-12 h-12 text-emerald-500" />
      </div>
      <motion.div
        className="absolute -bottom-1 -right-1"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <FileText className="w-8 h-8 text-emerald-400" />
      </motion.div>
    </div>
  ),
  'no-scrapers': (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center">
        <Database className="w-12 h-12 text-purple-500" />
      </div>
      <motion.div
        className="absolute -top-1 -left-1"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="w-6 h-6 rounded-full bg-purple-200" />
      </motion.div>
    </div>
  ),
  'empty-queue': (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-amber-500" />
      </div>
      <motion.div
        className="absolute top-0 right-0"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="text-2xl">✨</span>
      </motion.div>
    </div>
  ),
  'no-activity': (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
    </div>
  ),
}

const defaultContent: Record<
  EmptyStateType,
  { title: string; description: string }
> = {
  'no-prospects': {
    title: 'No prospects yet',
    description:
      'Run a scraper from the Research tab to discover potential contacts for your summit.',
  },
  'no-results': {
    title: 'No matching results',
    description:
      'Try adjusting your filters or search terms to find what you\'re looking for.',
  },
  'no-exports': {
    title: 'No exports yet',
    description:
      'Select prospects and create an export to download or share your data.',
  },
  'no-scrapers': {
    title: 'No scrapers configured',
    description:
      'Configure data sources to start discovering prospects for your summit.',
  },
  'empty-queue': {
    title: 'Enrichment queue is empty',
    description:
      'Import prospects from the Research tab, then enrich them with AI-powered insights.',
  },
  'no-activity': {
    title: 'No recent activity',
    description:
      'Your activity log will appear here once you start working with prospects.',
  },
}

export default function EmptyState({
  type,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const content = {
    title: title || defaultContent[type].title,
    description: description || defaultContent[type].description,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className,
      )}
    >
      {illustrations[type]}

      <h3 className="mt-6 text-lg font-semibold text-text-primary">
        {content.title}
      </h3>

      <p className="mt-2 text-sm text-text-muted max-w-sm">
        {content.description}
      </p>

      {action && (
        <Button variant="gold" className="mt-6" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
