import { Mail, MailCheck, MailWarning, MailX, MailQuestion } from 'lucide-react'
import type { EmailSource } from '@/types'

interface EmailConfidenceBadgeProps {
  email: string | null
  verified: boolean
  confidence: number
  source: EmailSource | null
  showEmail?: boolean
  size?: 'sm' | 'md'
}

function getConfidenceColor(confidence: number, verified: boolean): string {
  if (verified) return 'text-emerald-600 bg-emerald-50'
  if (confidence >= 90) return 'text-emerald-600 bg-emerald-50'
  if (confidence >= 70) return 'text-amber-600 bg-amber-50'
  if (confidence >= 50) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

function getConfidenceIcon(confidence: number, verified: boolean, hasEmail: boolean) {
  if (!hasEmail) return MailX
  if (verified) return MailCheck
  if (confidence >= 70) return Mail
  if (confidence >= 50) return MailWarning
  return MailQuestion
}

function getSourceLabel(source: EmailSource | null): string {
  switch (source) {
    case 'hunter':
      return 'Hunter.io'
    case 'pattern':
      return 'Pattern Match'
    case 'manual':
      return 'Manual'
    case 'scraped':
      return 'Scraped'
    default:
      return 'Unknown'
  }
}

export default function EmailConfidenceBadge({
  email,
  verified,
  confidence,
  source,
  showEmail = false,
  size = 'sm',
}: EmailConfidenceBadgeProps) {
  const hasEmail = !!email
  const colorClass = hasEmail ? getConfidenceColor(confidence, verified) : 'text-gray-400 bg-gray-100'
  const Icon = getConfidenceIcon(confidence, verified, hasEmail)
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'

  if (!hasEmail) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${padding} rounded-full ${colorClass} ${textSize}`}
        title="No email found"
      >
        <Icon className={iconSize} />
        <span>No email</span>
      </span>
    )
  }

  const tooltipLines = [
    `Email: ${email}`,
    `Confidence: ${confidence}%`,
    `Verified: ${verified ? 'Yes' : 'No'}`,
    `Source: ${getSourceLabel(source)}`,
  ]

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full ${colorClass} ${textSize} cursor-help`}
      title={tooltipLines.join('\n')}
    >
      <Icon className={iconSize} />
      {showEmail ? (
        <span className="truncate max-w-[180px]">{email}</span>
      ) : (
        <span>
          {confidence}%
          {verified && <span className="ml-1 font-medium">Verified</span>}
        </span>
      )}
    </span>
  )
}

// Compact version for table rows
export function EmailConfidenceDot({
  verified,
  confidence,
  source,
}: {
  verified: boolean
  confidence: number
  source: EmailSource | null
}) {
  let colorClass = 'bg-gray-300'
  let title = 'No confidence data'

  if (verified) {
    colorClass = 'bg-emerald-500'
    title = `Verified email (${getSourceLabel(source)})`
  } else if (confidence >= 90) {
    colorClass = 'bg-emerald-400'
    title = `High confidence: ${confidence}% (${getSourceLabel(source)})`
  } else if (confidence >= 70) {
    colorClass = 'bg-amber-400'
    title = `Medium confidence: ${confidence}% (${getSourceLabel(source)})`
  } else if (confidence >= 50) {
    colorClass = 'bg-orange-400'
    title = `Low confidence: ${confidence}% (${getSourceLabel(source)})`
  } else if (confidence > 0) {
    colorClass = 'bg-red-400'
    title = `Very low confidence: ${confidence}% (${getSourceLabel(source)})`
  }

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colorClass} cursor-help`}
      title={title}
    />
  )
}
