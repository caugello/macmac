import { startOfWeek, endOfWeek, format, isToday, parseISO } from 'date-fns'
import { useRecipes } from '@/hooks/useRecipes'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useAuth } from '@/contexts/AuthContext'
import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { SmartSuggestionCard } from '@/components/dashboard/SmartSuggestionCard'
import { getSmartSuggestion } from '@/components/dashboard/smartSuggestion'
import { FeaturedRecipeCard } from '@/components/dashboard/FeaturedRecipeCard'
import { DailyTrajectory } from '@/components/dashboard/DailyTrajectory'

export const Dashboard = () => {
  const { user } = useAuth()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const {
    data: recipesData,
    isLoading: recipesLoading,
    error: recipesError,
  } = useRecipes({ limit: 1, sort: 'Newest' })

  const {
    data: mealPlansData,
    isLoading: mealPlansLoading,
    error: mealPlansError,
  } = useMealPlans({
    start_date: format(weekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
  })

  const recipes = recipesData?.data ?? []
  const recipeTotal = recipesData?.total ?? 0
  const plannedMeals = mealPlansData?.data ?? []
  const plannedCount = plannedMeals.length
  const todayMeals = plannedMeals.filter((meal) => isToday(parseISO(meal.date)))
  const featuredRecipe = recipes[0]

  const greetingName = user?.username || 'there'
  const dataReady = !recipesLoading && !mealPlansLoading
  const suggestion = getSmartSuggestion({ recipeTotal, plannedThisWeek: plannedCount })

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 pb-32 space-y-8">
      <GreetingHeader name={greetingName} todayCount={todayMeals.length} />

      {/* Smart suggestion (next best action from real account state) */}
      {dataReady && !recipesError && !mealPlansError && (
        <SmartSuggestionCard suggestion={suggestion} />
      )}

      {/* Featured recipe (newest real recipe) */}
      {recipesError ? (
        <section aria-label="Featured recipe" className="space-y-4">
          <h2 className="text-title-lg font-heading font-semibold text-on-surface">
            Featured recipe
          </h2>
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-6">
            <p className="text-destructive text-body-md">
              Couldn&apos;t load your recipes. Please try again.
            </p>
          </div>
        </section>
      ) : recipesLoading ? (
        <section aria-label="Featured recipe" className="space-y-4">
          <h2 className="text-title-lg font-heading font-semibold text-on-surface">
            Featured recipe
          </h2>
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden md:flex">
            <div className="aspect-[16/9] md:aspect-auto md:w-2/5 min-h-[180px] skeleton-shimmer" />
            <div className="p-6 md:flex-1 space-y-3">
              <div className="h-6 w-2/3 rounded bg-surface-container skeleton-shimmer" />
              <div className="h-4 w-full rounded bg-surface-container skeleton-shimmer" />
              <div className="h-4 w-1/3 rounded bg-surface-container skeleton-shimmer" />
            </div>
          </div>
        </section>
      ) : featuredRecipe ? (
        <FeaturedRecipeCard recipe={featuredRecipe} />
      ) : null}

      {/* Today's trajectory (real meals planned for today) */}
      {mealPlansError ? (
        <section aria-label="Today's trajectory" className="space-y-4">
          <h2 className="text-title-lg font-heading font-semibold text-on-surface">
            Today&apos;s trajectory
          </h2>
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-6">
            <p className="text-destructive text-body-md">
              Couldn&apos;t load your meal plan. Please try again.
            </p>
          </div>
        </section>
      ) : mealPlansLoading ? (
        <section aria-label="Today's trajectory" className="space-y-4">
          <h2 className="text-title-lg font-heading font-semibold text-on-surface">
            Today&apos;s trajectory
          </h2>
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 rounded-lg bg-surface-container skeleton-shimmer" />
            ))}
          </div>
        </section>
      ) : (
        <DailyTrajectory meals={todayMeals} />
      )}
    </div>
  )
}
