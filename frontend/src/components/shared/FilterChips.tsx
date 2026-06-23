import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const COLLAPSED_MAX_HEIGHT = 104

interface FilterChipsProps {
  items: string[]
  activeItem: string
  onItemChange: (item: string) => void
  className?: string
}

export const FilterChips = ({ items, activeItem, onItemChange, className }: FilterChipsProps) => {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || expanded) return
    setOverflows(el.scrollHeight > el.clientHeight)
  }, [items, expanded])

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={cn('flex flex-wrap gap-2 sm:gap-3 py-3', !expanded && 'overflow-hidden')}
        style={!expanded ? { maxHeight: COLLAPSED_MAX_HEIGHT } : undefined}
      >
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onItemChange(item)}
            className={cn(
              'px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-caption font-medium uppercase tracking-wider whitespace-nowrap transition-colors',
              activeItem === item
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            )}
          >
            {item}
          </button>
        ))}
      </div>
      {overflows && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-1 text-caption text-primary font-medium hover:underline"
        >
          {expanded ? 'Show less' : `Show all (${items.length})`}
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={16} />
        </button>
      )}
    </div>
  )
}
