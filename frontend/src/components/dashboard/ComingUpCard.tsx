import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

// Label hue per meal slot, matching screen 01 (amber / green / coral).
const SLOT_LABEL_COLOR: Record<MealTypeEnum, string> = {
  [MealTypeEnum.BREAKFAST]: '#FFB800',
  [MealTypeEnum.LUNCH]: '#9BD117',
  [MealTypeEnum.DINNER]: '#FF6A3D',
}

interface ComingUpCardProps {
  /** Upcoming meals (today onward), already sorted. */
  meals: MealPlanOut[]
}

/** "Coming up this week" bento row (screen 01): the next planned meals. */
export const ComingUpCard = ({ meals }: ComingUpCardProps) => {
  const items = meals.slice(0, 3)

  return (
    <Card tone="white" className="p-5 md:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-label-md font-bold text-ink">Coming up this week</h2>
        <Link
          to="/meal-plans"
          className="font-body text-caption font-bold text-ink/60 transition-colors hover:text-ink"
        >
          See all
        </Link>
      </div>

      {items.length === 0 ? (
        <Link
          to="/meal-plans"
          className="flex items-center gap-2 rounded-2xl bg-cream px-4 py-4 font-body text-body-md text-ink/60 transition-colors hover:text-ink"
        >
          <Icon name="add" size={18} className="text-green" />
          Nothing left to cook this week — plan a meal
        </Link>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((meal) => (
            <Link
              key={meal.id}
              to="/meal-plans"
              className="flex items-center gap-3 rounded-2xl bg-cream p-2.5 transition-colors hover:bg-surface-container-high"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest">
                <Icon name="restaurant" size={22} className="text-ink/40" />
              </span>
              <div className="min-w-0">
                <p
                  className="font-body text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: SLOT_LABEL_COLOR[meal.meal_type] }}
                >
                  {format(parseISO(meal.date), 'EEE')} · {meal.meal_type}
                </p>
                <p className="font-body text-body-md font-semibold text-ink line-clamp-1">
                  {meal.recipe_title ?? 'Untitled recipe'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
