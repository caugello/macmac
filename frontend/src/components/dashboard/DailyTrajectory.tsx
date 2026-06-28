import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
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
    <section aria-label="Today's trajectory" className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="font-display text-title-lg font-semibold text-ink">
          Today&apos;s trajectory
        </h2>
        <Link
          to="/meal-plans"
          className="flex min-h-[44px] items-center gap-1 px-2 font-body text-label-md font-semibold text-ink/70 transition-colors hover:text-ink"
        >
          View calendar
          <Icon name="chevron_right" size={18} />
        </Link>
      </div>

      <Card tone="ink" className="flex-1 p-5 md:p-6">
        <ol className="relative space-y-1">
          {SLOTS.map((slot, index) => {
            const meal = byType.get(slot.type)
            const planned = Boolean(meal)
            const isLast = index === SLOTS.length - 1

            return (
              <li key={slot.type} className="flex min-h-[56px] gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      planned
                        ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime'
                        : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10'
                    }
                  >
                    <Icon
                      name={slot.icon}
                      size={20}
                      className={planned ? 'text-ink' : 'text-cream/40'}
                    />
                  </span>
                  {!isLast && <span className="my-1 w-px flex-1 bg-cream/15" />}
                </div>

                <div className="min-w-0 flex-1 pb-4">
                  <p className="font-body text-caption font-semibold uppercase tracking-wide text-cream/50">
                    {slot.label}
                  </p>
                  {planned ? (
                    <Link
                      to="/meal-plans"
                      className="font-body text-body-md font-medium text-cream line-clamp-1 transition-colors hover:text-lime"
                    >
                      {meal?.recipe_title ?? 'Untitled recipe'}
                    </Link>
                  ) : (
                    <Link
                      to="/meal-plans"
                      className="inline-flex items-center gap-1 font-body text-body-md text-cream/60 transition-colors hover:text-lime"
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
      </Card>
    </section>
  )
}
