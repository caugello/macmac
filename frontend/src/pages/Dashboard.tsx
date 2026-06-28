import { startOfWeek, endOfWeek, format, isToday, parseISO } from 'date-fns'
import { useRecipes } from '@/hooks/useRecipes'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
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
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 md:px-6">
      <GreetingHeader name={greetingName} todayCount={todayMeals.length} />

      {/* Asymmetric bento grid: single column on mobile, multi-column on desktop. */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Featured recipe (newest real recipe) — large bento tile. */}
        <div className="md:col-span-2 lg:row-span-2">
          {recipesError ? (
            <section aria-label="Featured recipe" className="flex h-full flex-col gap-3">
              <h2 className="px-1 font-display text-title-lg font-semibold text-ink">
                Featured recipe
              </h2>
              <Card tone="white" className="flex-1 p-6">
                <p className="font-body text-body-md text-coral">
                  Couldn&apos;t load your recipes. Please try again.
                </p>
              </Card>
            </section>
          ) : recipesLoading ? (
            <section aria-label="Featured recipe" className="flex h-full flex-col gap-3">
              <h2 className="px-1 font-display text-title-lg font-semibold text-ink">
                Featured recipe
              </h2>
              <Card tone="white" className="flex-1 overflow-hidden md:flex">
                <div className="aspect-[16/9] min-h-[180px] skeleton-shimmer md:aspect-auto md:w-2/5" />
                <div className="space-y-3 p-6 md:flex-1">
                  <div className="h-6 w-2/3 rounded bg-cream skeleton-shimmer" />
                  <div className="h-4 w-full rounded bg-cream skeleton-shimmer" />
                  <div className="h-4 w-1/3 rounded bg-cream skeleton-shimmer" />
                </div>
              </Card>
            </section>
          ) : featuredRecipe ? (
            <FeaturedRecipeCard recipe={featuredRecipe} />
          ) : null}
        </div>

        {/* Smart suggestion (next best action from real account state). */}
        {dataReady && !recipesError && !mealPlansError && (
          <div className="lg:col-span-1">
            <SmartSuggestionCard suggestion={suggestion} />
          </div>
        )}

        {/* Today's trajectory (real meals planned for today). */}
        <div className="md:col-span-2 lg:col-span-1">
          {mealPlansError ? (
            <section aria-label="Today's trajectory" className="flex h-full flex-col gap-3">
              <h2 className="px-1 font-display text-title-lg font-semibold text-ink">
                Today&apos;s trajectory
              </h2>
              <Card tone="white" className="flex-1 p-6">
                <p className="font-body text-body-md text-coral">
                  Couldn&apos;t load your meal plan. Please try again.
                </p>
              </Card>
            </section>
          ) : mealPlansLoading ? (
            <section aria-label="Today's trajectory" className="flex h-full flex-col gap-3">
              <h2 className="px-1 font-display text-title-lg font-semibold text-ink">
                Today&apos;s trajectory
              </h2>
              <Card tone="white" className="flex-1 space-y-3 p-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 rounded-lg bg-cream skeleton-shimmer" />
                ))}
              </Card>
            </section>
          ) : (
            <DailyTrajectory meals={todayMeals} />
          )}
        </div>
      </div>
    </div>
  )
}
