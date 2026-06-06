import { RecipeCategoryEnum } from './types'

export interface RecipeCategoryMeta {
  value: RecipeCategoryEnum
  label: string
  /** Full static Tailwind classes (kept static so JIT can detect them). */
  badgeClass: string
}

// Ordered for display in selectors and filter chips.
export const RECIPE_CATEGORIES: RecipeCategoryMeta[] = [
  {
    value: RecipeCategoryEnum.BREAKFAST,
    label: 'Breakfast',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    value: RecipeCategoryEnum.MAIN,
    label: 'Main',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    value: RecipeCategoryEnum.DESSERT,
    label: 'Dessert',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  {
    value: RecipeCategoryEnum.SNACK,
    label: 'Snack',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    value: RecipeCategoryEnum.APPETIZER,
    label: 'Appetizer',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  {
    value: RecipeCategoryEnum.BEVERAGE,
    label: 'Beverage',
    badgeClass: 'bg-amber-900/10 text-amber-900 border-amber-900/20',
  },
  {
    value: RecipeCategoryEnum.OTHER,
    label: 'Other',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  },
]

export const UNCATEGORIZED_META: RecipeCategoryMeta = {
  // `value` is unused for the null case but keeps the shape consistent.
  value: RecipeCategoryEnum.OTHER,
  label: 'Uncategorized',
  badgeClass: 'bg-surface-container text-on-surface-variant border-outline-variant',
}

const META_BY_VALUE = new Map(RECIPE_CATEGORIES.map((meta) => [meta.value, meta]))

/** Returns display metadata for a category, falling back to "Uncategorized" for null. */
export const getCategoryMeta = (category: RecipeCategoryEnum | null): RecipeCategoryMeta =>
  (category && META_BY_VALUE.get(category)) || UNCATEGORIZED_META
