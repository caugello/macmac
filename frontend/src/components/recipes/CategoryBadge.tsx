import { cn } from '@/lib/utils'
import { getCategoryMeta } from '@/lib/recipeCategory'
import type { RecipeCategoryEnum } from '@/lib/types'

interface CategoryBadgeProps {
  category: RecipeCategoryEnum | null
  className?: string
}

export const CategoryBadge = ({ category, className }: CategoryBadgeProps) => {
  const meta = getCategoryMeta(category)
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap',
        meta.badgeClass,
        className
      )}
    >
      {meta.label}
    </span>
  )
}
