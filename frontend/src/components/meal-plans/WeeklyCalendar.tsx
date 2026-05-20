import { useState } from 'react'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { useMealPlans } from '@/hooks/useMealPlans'
import { MealSlot } from './MealSlot'
import { Icon } from '@/components/ui/icon'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

export const WeeklyCalendar = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekEnd = addDays(currentWeekStart, 6)

  const { data, isLoading } = useMealPlans({
    start_date: format(currentWeekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  const mealTypes = [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]

  const mealPlanMap = new Map<string, MealPlanOut>()
  data?.data.forEach((mp) => {
    const key = `${mp.date}-${mp.meal_type}`
    mealPlanMap.set(key, mp)
  })

  const handlePrevWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1))
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 mx-auto rounded skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevWeek}
          className="w-10 h-10 flex items-center justify-center rounded-full wireframe-border hover:bg-surface-container-low transition-colors"
        >
          <Icon name="chevron_left" size={20} />
        </button>
        <h2 className="text-headline-md font-heading font-semibold">
          {format(currentWeekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <button
          onClick={handleNextWeek}
          className="w-10 h-10 flex items-center justify-center rounded-full wireframe-border hover:bg-surface-container-low transition-colors"
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 stagger-grid">
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          return (
            <div
              key={day.toISOString()}
              className="bg-surface-container-lowest rounded-lg wireframe-border overflow-hidden"
            >
              <div className="bg-primary/5 px-4 py-3 border-b border-outline-variant/50 flex items-center justify-between">
                <div>
                  <span className="text-headline-md-mobile font-heading font-semibold text-primary">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-label-sm text-on-surface-variant ml-2">
                    {format(day, 'MMM d')}
                  </span>
                </div>
                <button className="p-1 text-on-surface-variant hover:text-primary transition-colors">
                  <Icon name="more_vert" size={18} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {mealTypes.map((mealType) => (
                  <div key={mealType}>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium block mb-2">
                      {mealType}
                    </span>
                    <MealSlot
                      date={dateStr}
                      mealType={mealType}
                      mealPlan={mealPlanMap.get(`${dateStr}-${mealType}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
