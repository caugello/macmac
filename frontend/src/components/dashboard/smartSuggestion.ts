export interface SmartSuggestion {
  /** Tonal terracotta chip label. */
  caption: string
  title: string
  description: string
  primaryLabel: string
  primaryTo: string
  secondaryLabel?: string
  secondaryTo?: string
  icon: string
}

/**
 * Derives the next best action from real account state.
 * No fabricated data — every branch reflects what the user actually has.
 */
export const getSmartSuggestion = ({
  recipeTotal,
  plannedThisWeek,
}: {
  recipeTotal: number
  plannedThisWeek: number
}): SmartSuggestion => {
  if (recipeTotal === 0) {
    return {
      caption: 'Get started',
      title: 'Add your first recipe',
      description:
        'Build your collection so MacMac can turn your meals into a priced shopping list.',
      primaryLabel: 'Add a recipe',
      primaryTo: '/recipes/new',
      secondaryLabel: 'Browse catalog',
      secondaryTo: '/catalog',
      icon: 'add_circle',
    }
  }

  if (plannedThisWeek === 0) {
    return {
      caption: 'Smart suggestion',
      title: 'Plan your week',
      description:
        'You have recipes ready to go. Drop them onto this week’s calendar to generate a shopping list.',
      primaryLabel: 'Start planning',
      primaryTo: '/meal-plans',
      secondaryLabel: 'View recipes',
      secondaryTo: '/recipes',
      icon: 'auto_awesome',
    }
  }

  return {
    caption: 'Smart suggestion',
    title: 'Turn your plan into a shopping list',
    description: `You’ve planned ${plannedThisWeek} ${
      plannedThisWeek === 1 ? 'meal' : 'meals'
    } this week. Generate a priced, sorted shopping list in one tap.`,
    primaryLabel: 'Open meal plan',
    primaryTo: '/meal-plans',
    secondaryLabel: 'Browse catalog',
    secondaryTo: '/catalog',
    icon: 'shopping_cart',
  }
}
