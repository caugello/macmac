import { Link } from 'react-router-dom'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { useRecipes } from '@/hooks/useRecipes'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useAuth } from '@/contexts/AuthContext'
import { CategoryBadge } from '@/components/recipes/CategoryBadge'
import { Icon } from '@/components/ui/icon'

const cardHues = [15, 25, 35, 140, 30, 45, 10, 200, 50, 20]
const getCardHue = (title: string) => {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return cardHues[Math.abs(hash) % cardHues.length]
}

const quickActions = [
  {
    to: '/meal-plans',
    icon: 'calendar_month',
    label: 'Plan meals',
    description: 'Build your weekly calendar',
  },
  {
    to: '/recipes/new',
    icon: 'add',
    label: 'Add recipe',
    description: 'Grow your collection',
  },
  {
    to: '/catalog',
    icon: 'menu_book',
    label: 'Browse catalog',
    description: 'Find real store products',
  },
]

export const Dashboard = () => {
  const { user } = useAuth()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const {
    data: recipesData,
    isLoading: recipesLoading,
    error: recipesError,
  } = useRecipes({ limit: 4, sort: 'Newest' })

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

  const greetingName = user?.username || 'there'

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-32 space-y-8 md:space-y-10">
      {/* Greeting */}
      <header className="space-y-1.5">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-heading font-bold text-on-surface">
          Welcome back, {greetingName}
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Here&apos;s what&apos;s cooking this week.
        </p>
      </header>

      {/* Quick stats */}
      <section aria-label="Quick stats">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="restaurant_menu" size={24} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-headline-md font-heading font-bold leading-none">
                {recipesLoading ? '—' : recipeTotal}
              </p>
              <p className="text-caption text-on-surface-variant mt-1">
                {recipeTotal === 1 ? 'Recipe' : 'Recipes'}
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="calendar_month" size={24} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-headline-md font-heading font-bold leading-none">
                {mealPlansLoading ? '—' : plannedCount}
              </p>
              <p className="text-caption text-on-surface-variant mt-1">
                {plannedCount === 1 ? 'Meal this week' : 'Meals this week'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* This week's meal plan */}
      <section aria-label="This week's meal plan" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-lg font-heading font-semibold text-on-surface">
            This week&apos;s plan
          </h2>
          <Link
            to="/meal-plans"
            className="text-label-md font-semibold text-primary hover:brightness-110 transition-all flex items-center gap-1 min-h-[44px] px-2"
          >
            View calendar
            <Icon name="chevron_right" size={18} />
          </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-5 md:p-6">
          <p className="text-caption text-on-surface-variant mb-3">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
          </p>

          {mealPlansLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-12 rounded-lg bg-surface-container skeleton-shimmer" />
              ))}
            </div>
          ) : mealPlansError ? (
            <p className="text-destructive text-body-md">
              Couldn&apos;t load your meal plan. Please try again.
            </p>
          ) : plannedCount === 0 ? (
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="event_note" size={30} className="text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-body-lg font-heading font-semibold">No meals planned yet</p>
                <p className="text-body-md text-on-surface-variant">
                  Plan your week and turn it into a priced shopping list.
                </p>
              </div>
              <Link
                to="/meal-plans"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-label-md font-semibold hover:brightness-110 transition-all min-h-[44px] flex items-center"
              >
                Plan meals
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/30">
              {plannedMeals.slice(0, 5).map((meal) => (
                <li key={meal.id} className="flex items-center gap-3 py-3 min-h-[44px]">
                  <span className="text-caption font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                    {meal.meal_type}
                  </span>
                  <span className="text-body-md text-on-surface truncate flex-1">
                    {meal.recipe_title ?? 'Untitled recipe'}
                  </span>
                  <span className="text-caption text-on-surface-variant shrink-0">
                    {format(new Date(meal.date), 'EEE')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent recipes */}
      <section aria-label="Recent recipes" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-lg font-heading font-semibold text-on-surface">
            Recent recipes
          </h2>
          <Link
            to="/recipes"
            className="text-label-md font-semibold text-primary hover:brightness-110 transition-all flex items-center gap-1 min-h-[44px] px-2"
          >
            View all
            <Icon name="chevron_right" size={18} />
          </Link>
        </div>

        {recipesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden"
              >
                <div className="aspect-square skeleton-shimmer" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-surface-container skeleton-shimmer" />
                  <div className="h-3 w-1/2 rounded bg-surface-container skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : recipesError ? (
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-6">
            <p className="text-destructive text-body-md">
              Couldn&apos;t load your recipes. Please try again.
            </p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="restaurant_menu" size={30} className="text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-body-lg font-heading font-semibold">No recipes yet</p>
              <p className="text-body-md text-on-surface-variant">
                Add your first recipe to start building your collection.
              </p>
            </div>
            <Link
              to="/recipes/new"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-label-md font-semibold hover:brightness-110 transition-all min-h-[44px] flex items-center"
            >
              Add recipe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 stagger-grid">
            {recipes.map((recipe) => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="group">
                <div className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden card-hover-shadow">
                  <div className="aspect-square relative overflow-hidden">
                    <div
                      className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
                      style={{
                        background: `linear-gradient(135deg, hsl(${getCardHue(recipe.title)} 40% 92%) 0%, hsl(${getCardHue(recipe.title)} 30% 85%) 100%)`,
                      }}
                    >
                      <Icon name="restaurant_menu" size={48} className="text-outline-variant/30" />
                    </div>
                    <CategoryBadge
                      category={recipe.category}
                      className="absolute top-2 left-2 backdrop-blur-sm"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-label-md font-heading font-semibold text-on-surface line-clamp-2 min-h-[2.8em]">
                      {recipe.title}
                    </h3>
                    <p className="text-caption text-on-surface-variant mt-1.5">
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="space-y-4">
        <h2 className="text-title-lg font-heading font-semibold text-on-surface">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="bg-surface-container-lowest rounded-xl ambient-shadow card-hover-shadow p-5 flex items-center gap-4 min-h-[44px]"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name={action.icon} size={24} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-label-md font-heading font-semibold text-on-surface">
                  {action.label}
                </p>
                <p className="text-caption text-on-surface-variant mt-0.5">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
