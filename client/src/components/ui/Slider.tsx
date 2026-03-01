import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps {
  min?: number
  max?: number
  step?: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  label?: string
  showValues?: boolean
  className?: string
}

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  label,
  showValues = true,
  className,
}: SliderProps) {
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min
      const rect = trackRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const rawValue = min + percentage * (max - min)
      return Math.round(rawValue / step) * step
    },
    [min, max, step],
  )

  const handleMouseDown = (type: 'min' | 'max') => {
    setDragging(type)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return
      const newValue = getValueFromPosition(e.clientX)

      if (dragging === 'min') {
        onChange([Math.min(newValue, value[1] - step), value[1]])
      } else {
        onChange([value[0], Math.max(newValue, value[0] + step)])
      }
    },
    [dragging, value, onChange, getValueFromPosition, step],
  )

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  return (
    <div className={cn('w-full', className)}>
      {(label || showValues) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-text-primary">{label}</span>
          )}
          {showValues && (
            <span className="text-sm font-mono text-text-secondary">
              {value[0]} - {value[1]}
            </span>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        className="relative h-2 bg-surface-secondary rounded-full cursor-pointer"
      >
        {/* Filled track */}
        <div
          className="absolute h-full bg-brand-gold rounded-full"
          style={{
            left: `${getPercentage(value[0])}%`,
            width: `${getPercentage(value[1]) - getPercentage(value[0])}%`,
          }}
        />

        {/* Min handle */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand-gold rounded-full cursor-grab shadow-sm',
            dragging === 'min' && 'cursor-grabbing ring-2 ring-brand-gold/30',
          )}
          style={{ left: `${getPercentage(value[0])}%` }}
          onMouseDown={() => handleMouseDown('min')}
        />

        {/* Max handle */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand-gold rounded-full cursor-grab shadow-sm',
            dragging === 'max' && 'cursor-grabbing ring-2 ring-brand-gold/30',
          )}
          style={{ left: `${getPercentage(value[1])}%` }}
          onMouseDown={() => handleMouseDown('max')}
        />
      </div>
    </div>
  )
}
