import { useState } from 'react'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { useMealPlans } from '@/hooks/useMealPlans'
import { MealSlot } from './MealSlot'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

export const WeeklyCalendar = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  )

  const weekEnd = addDays(currentWeekStart, 6)

  const { data, isLoading } = useMealPlans({
    start_date: format(currentWeekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
  })

  // Build 7x3 grid (7 days, 3 meals)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  const mealTypes = [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]

  // Index meal plans by date+meal_type
  const mealPlanMap = new Map<string, MealPlanOut>()
  data?.data.forEach((mp) => {
    const key = `${mp.date}-${mp.meal_type}`
    mealPlanMap.set(key, mp)
  })

  const handlePrevWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1))
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1))

  if (isLoading) {
    return <div className="text-gray-400">Loading calendar...</div>
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handlePrevWeek}
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-white">
          Week of {format(currentWeekStart, 'MMM d, yyyy')}
        </h2>
        <Button
          onClick={handleNextWeek}
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-8 gap-2">
        {/* Header Row */}
        <div className="col-span-1" /> {/* Empty corner */}
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="text-center font-semibold text-gray-300">
            <div>{format(day, 'EEE')}</div>
            <div className="text-sm text-gray-500">{format(day, 'MMM d')}</div>
          </div>
        ))}
        {/* Meal Rows */}
        {mealTypes.map((mealType) => (
          <>
            <div
              key={`label-${mealType}`}
              className="flex items-center justify-end pr-4 font-medium text-gray-400 capitalize"
            >
              {mealType}
            </div>
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const key = `${dateStr}-${mealType}`
              const mealPlan = mealPlanMap.get(key)

              return <MealSlot key={key} date={dateStr} mealType={mealType} mealPlan={mealPlan} />
            })}
          </>
        ))}
      </div>
    </div>
  )
}
