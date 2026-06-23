import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

interface DailyTrajectoryProps {
  /** Meals planned for today only (real data). */
  meals: MealPlanOut[]
}

const SLOTS: { type: MealTypeEnum; label: string; icon: string }[] = [
  { type: MealTypeEnum.BREAKFAST, label: 'Breakfast', icon: 'wb_twilight' },
  { type: MealTypeEnum.LUNCH, label: 'Lunch', icon: 'light_mode' },
  { type: MealTypeEnum.DINNER, label: 'Dinner', icon: 'dark_mode' },
]

export const DailyTrajectory = ({ meals }: DailyTrajectoryProps) => {
  const byType = new Map(meals.map((m) => [m.meal_type, m]))

  return (
    <section aria-label="Today's trajectory" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-lg font-heading font-semibold text-on-surface">
          Today&apos;s trajectory
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
        <ol className="relative space-y-1">
          {SLOTS.map((slot, index) => {
            const meal = byType.get(slot.type)
            const planned = Boolean(meal)
            const isLast = index === SLOTS.length - 1

            return (
              <li key={slot.type} className="flex gap-4 min-h-[56px]">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      planned
                        ? 'w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'
                        : 'w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0'
                    }
                  >
                    <Icon
                      name={slot.icon}
                      size={20}
                      className={planned ? 'text-primary' : 'text-outline-variant'}
                    />
                  </span>
                  {!isLast && <span className="w-px flex-1 bg-outline-variant/40 my-1" />}
                </div>

                <div className="flex-1 pb-4 min-w-0">
                  <p className="text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
                    {slot.label}
                  </p>
                  {planned ? (
                    <Link
                      to="/meal-plans"
                      className="text-body-md font-medium text-on-surface hover:text-primary transition-colors line-clamp-1"
                    >
                      {meal?.recipe_title ?? 'Untitled recipe'}
                    </Link>
                  ) : (
                    <Link
                      to="/meal-plans"
                      className="text-body-md text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      <Icon name="add" size={16} />
                      Plan {slot.label.toLowerCase()}
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
