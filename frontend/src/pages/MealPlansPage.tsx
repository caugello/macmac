import { useState } from 'react'
import { startOfWeek, addDays } from 'date-fns'
import { WeeklyCalendar } from '@/components/meal-plans/WeeklyCalendar'
import { ShoppingList } from '@/components/meal-plans/ShoppingList'

export const MealPlansPage = () => {
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(currentWeekStart, 6)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-white">Meal Calendar</h1>

      <WeeklyCalendar />

      <ShoppingList weekStart={currentWeekStart} weekEnd={weekEnd} />
    </div>
  )
}
