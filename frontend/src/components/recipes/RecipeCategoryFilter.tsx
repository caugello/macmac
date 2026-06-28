import { cn } from '@/lib/utils'
import { RECIPE_CATEGORIES } from '@/lib/recipeCategory'
import type { RecipeCategoryEnum } from '@/lib/types'

interface RecipeCategoryFilterProps {
  selected: RecipeCategoryEnum[]
  onToggle: (category: RecipeCategoryEnum) => void
  /** Optional per-category recipe counts, keyed by category value. */
  counts?: Record<string, number>
  className?: string
}

/** Multi-select category filter chips. An empty selection means "all categories". */
export const RecipeCategoryFilter = ({
  selected,
  onToggle,
  counts,
  className,
}: RecipeCategoryFilterProps) => {
  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
      aria-label="Filter by category"
    >
      {RECIPE_CATEGORIES.map((c) => {
        const isActive = selected.includes(c.value)
        const count = counts?.[c.value]
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onToggle(c.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-caption font-semibold tracking-wide whitespace-nowrap transition-colors',
              isActive
                ? 'bg-ink text-cream'
                : 'bg-white text-muted-foreground border border-border hover:bg-surface-container'
            )}
          >
            {c.label}
            {count !== undefined && (
              <span
                className={cn(
                  'text-caption tabular-nums',
                  isActive ? 'text-cream/70' : 'text-muted-foreground/70'
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
