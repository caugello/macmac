import { useState } from 'react'
import { startOfWeek, addDays } from 'date-fns'
import { WeeklyCalendar } from '@/components/meal-plans/WeeklyCalendar'
import { CopyWeekModal } from '@/components/meal-plans/CopyWeekModal'
import { ShoppingListModal } from '@/components/meal-plans/ShoppingListModal'
import { Icon } from '@/components/ui/icon'

export const MealPlansPage = () => {
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [copyWeekOpen, setCopyWeekOpen] = useState(false)
  const weekEnd = addDays(currentWeekStart, 6)
  const [shoppingListOpen, setShoppingListOpen] = useState(false)

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-12 pt-6 pb-32 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-headline-xl font-heading font-bold">Meal Calendar</h1>
        <div className="flex items-center gap-2">
          <button className="bg-surface-container-lowest px-4 py-2 rounded-lg wireframe-border text-label-md flex items-center gap-2 whitespace-nowrap hover:bg-surface-container-low transition-colors">
            <Icon name="content_copy" size={18} />
            Copy Day
          </button>
          <button
            onClick={() => setCopyWeekOpen(true)}
            className="bg-surface-container-lowest px-4 py-2 rounded-lg wireframe-border text-label-md flex items-center gap-2 whitespace-nowrap hover:bg-surface-container-low transition-colors"
          >
            <Icon name="content_copy" size={18} />
            Copy Week
          </button>
          <button
            onClick={() => setShoppingListOpen(true)}
            className="bg-tertiary-container text-on-tertiary-container px-4 py-2 rounded-lg text-label-md flex items-center gap-2"
          >
            <Icon name="shopping_cart" size={18} />
            Shopping List
          </button>
        </div>
      </div>

      <WeeklyCalendar />

      <CopyWeekModal
        open={copyWeekOpen}
        onOpenChange={setCopyWeekOpen}
        sourceWeekStart={currentWeekStart}
      />

      <ShoppingListModal
        open={shoppingListOpen}
        onOpenChange={setShoppingListOpen}
        weekStart={currentWeekStart}
        weekEnd={weekEnd}
      />
    </div>
  )
}
