import { startOfWeek, endOfWeek, startOfToday, format, isToday, parseISO } from 'date-fns'
import { useRecipes, useRecipe } from '@/hooks/useRecipes'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { GreetingHeader } from '@/components/dashboard/GreetingHeader'
import { SmartSuggestionCard } from '@/components/dashboard/SmartSuggestionCard'
import { getSmartSuggestion } from '@/components/dashboard/smartSuggestion'
import { TonightCard } from '@/components/dashboard/TonightCard'
import { WeekTrack } from '@/components/dashboard/WeekTrack'
import { ComingUpCard } from '@/components/dashboard/ComingUpCard'
import { StatTile } from '@/components/dashboard/StatTile'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

const SLOT_RANK: Record<MealTypeEnum, number> = {
  [MealTypeEnum.BREAKFAST]: 0,
  [MealTypeEnum.LUNCH]: 1,
  [MealTypeEnum.DINNER]: 2,
}

const sortMeals = (a: MealPlanOut, b: MealPlanOut) =>
  a.date === b.date ? SLOT_RANK[a.meal_type] - SLOT_RANK[b.meal_type] : a.date.localeCompare(b.date)

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

  // "Tonight" = today's dinner if planned, otherwise the newest recipe.
  const todayDinner = todayMeals.find((m) => m.meal_type === MealTypeEnum.DINNER)
  const { data: dinnerRecipe } = useRecipe(todayDinner?.recipe_id ?? '')
  const tonightRecipe = dinnerRecipe ?? featuredRecipe
  const tonightEyebrow = dinnerRecipe ? 'Tonight · Dinner' : 'Featured'

  // "Coming up" = meals from today onward, in chronological order.
  const today = startOfToday()
  const upcoming = plannedMeals.filter((m) => parseISO(m.date) >= today).sort(sortMeals)

  const greetingName = user?.username || 'there'
  const dataReady = !recipesLoading && !mealPlansLoading
  const suggestion = getSmartSuggestion({ recipeTotal, plannedThisWeek: plannedCount })

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 md:px-6">
      <GreetingHeader name={greetingName} todayCount={todayMeals.length} />

      {/* Bento grid — single column on mobile, asymmetric 4-up on desktop (screen 01). */}
      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tonight hero. */}
        <div className="md:col-span-2 lg:row-span-2">
          {recipesError ? (
            <Card tone="white" className="flex h-full min-h-[280px] items-center p-6">
              <p className="font-body text-body-md text-coral">
                Couldn&apos;t load your recipes. Please try again.
              </p>
            </Card>
          ) : recipesLoading ? (
            <Card tone="ink" className="h-full min-h-[280px] skeleton-shimmer" />
          ) : tonightRecipe ? (
            <TonightCard recipe={tonightRecipe} eyebrow={tonightEyebrow} />
          ) : (
            <Card tone="ink" className="flex h-full min-h-[280px] flex-col justify-end gap-3 p-6">
              <h2 className="font-display text-headline-md font-bold text-cream">No recipes yet</h2>
              <p className="font-body text-body-md text-cream/70">
                Add your first recipe to see tonight&apos;s pick here.
              </p>
            </Card>
          )}
        </div>

        {/* Your week track. */}
        <div className="md:col-span-2">
          {mealPlansError ? (
            <Card tone="white" className="flex h-full min-h-[124px] items-center p-5">
              <p className="font-body text-body-md text-coral">
                Couldn&apos;t load your meal plan. Please try again.
              </p>
            </Card>
          ) : mealPlansLoading ? (
            <Card tone="white" className="h-full min-h-[124px] skeleton-shimmer" />
          ) : (
            <WeekTrack weekStart={weekStart} meals={plannedMeals} />
          )}
        </div>

        {/* Smart suggestion (next best action). */}
        {dataReady && !recipesError && !mealPlansError && (
          <div className="md:col-span-2">
            <SmartSuggestionCard suggestion={suggestion} />
          </div>
        )}

        {/* Stat tiles. */}
        <StatTile
          tone="lime"
          label="Recipes"
          value={recipeTotal}
          sub="in your library"
          icon="menu_book"
          to="/recipes"
        />
        <StatTile
          tone="white"
          label="This week"
          value={plannedCount}
          unit={plannedCount === 1 ? 'meal' : 'meals'}
          sub="planned"
          icon="calendar_month"
          iconClassName="text-coral"
          to="/meal-plans"
        />
        <StatTile
          tone="soft-purple"
          label="Today"
          value={todayMeals.length}
          unit={todayMeals.length === 1 ? 'meal' : 'meals'}
          sub="on the menu"
          icon="restaurant"
          iconClassName="text-[#6B4BE6]"
          to="/meal-plans"
        />
        <StatTile
          tone="white"
          label="Catalog"
          value="Browse"
          sub="real store prices"
          icon="storefront"
          iconClassName="text-green"
          to="/catalog"
        />

        {/* Coming up this week. */}
        {!mealPlansError && !mealPlansLoading && (
          <div className="md:col-span-2 lg:col-span-4">
            <ComingUpCard meals={upcoming} />
          </div>
        )}
      </div>
    </div>
  )
}
