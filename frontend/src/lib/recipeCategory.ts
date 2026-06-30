import { RecipeCategoryEnum } from './types'

export interface RecipeCategoryMeta {
  value: RecipeCategoryEnum
  label: string
  /**
   * Full static Tailwind classes (kept static so JIT can detect them). A solid
   * coloured pill with white text, matching the Pantry Fresh "07 — Recipe
   * Library" category badges.
   */
  badgeClass: string
}

// Ordered for display in selectors and filter chips.
export const RECIPE_CATEGORIES: RecipeCategoryMeta[] = [
  {
    value: RecipeCategoryEnum.BREAKFAST,
    label: 'Breakfast',
    badgeClass: 'bg-amber-500 text-white',
  },
  {
    value: RecipeCategoryEnum.MAIN,
    label: 'Main',
    badgeClass: 'bg-coral text-white',
  },
  {
    value: RecipeCategoryEnum.DESSERT,
    label: 'Dessert',
    badgeClass: 'bg-pink-500 text-white',
  },
  {
    value: RecipeCategoryEnum.SNACK,
    label: 'Snack',
    badgeClass: 'bg-green text-white',
  },
  {
    value: RecipeCategoryEnum.APPETIZER,
    label: 'Appetizer',
    badgeClass: 'bg-teal-600 text-white',
  },
  {
    value: RecipeCategoryEnum.BEVERAGE,
    label: 'Beverage',
    badgeClass: 'bg-sky-600 text-white',
  },
  {
    value: RecipeCategoryEnum.OTHER,
    label: 'Other',
    badgeClass: 'bg-ink text-white',
  },
]

export const UNCATEGORIZED_META: RecipeCategoryMeta = {
  // `value` is unused for the null case but keeps the shape consistent.
  value: RecipeCategoryEnum.OTHER,
  label: 'Uncategorized',
  badgeClass: 'bg-stone-400 text-white',
}

const META_BY_VALUE = new Map(RECIPE_CATEGORIES.map((meta) => [meta.value, meta]))

/** Returns display metadata for a category, falling back to "Uncategorized" for null. */
export const getCategoryMeta = (category: RecipeCategoryEnum | null): RecipeCategoryMeta =>
  (category && META_BY_VALUE.get(category)) || UNCATEGORIZED_META
