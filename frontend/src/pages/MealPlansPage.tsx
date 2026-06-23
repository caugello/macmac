import { useState } from 'react'
import { startOfWeek, addDays, format } from 'date-fns'
import { useMealPlans } from '@/hooks/useMealPlans'
import { WeeklyCalendar } from '@/components/meal-plans/WeeklyCalendar'
import { CopyWeekModal } from '@/components/meal-plans/CopyWeekModal'
import { ShoppingListModal } from '@/components/meal-plans/ShoppingListModal'
import { Icon } from '@/components/ui/icon'

export const MealPlansPage = () => {
  const [currentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(currentWeekStart, 6)
  const [copyWeekOpen, setCopyWeekOpen] = useState(false)
  const [shoppingListOpen, setShoppingListOpen] = useState(false)

  const {
    data: mealPlansData,
    isLoading,
    error,
  } = useMealPlans({
    start_date: format(currentWeekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
  })

  const plannedCount = mealPlansData?.data.length ?? 0

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-12 pt-6 pb-32 space-y-6">
      {/* Intro header */}
      <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-heading font-bold text-on-surface">
            Plan Your Week
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-prose">
            Curate your culinary journey. Select a day to schedule or review your meals.
          </p>
          <p
            aria-live="polite"
            className="text-caption text-on-surface-variant flex items-center gap-1.5 pt-1"
          >
            <Icon name="calendar_today" size={14} className="text-primary" />
            <span>
              {format(currentWeekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
              {' · '}
              {isLoading ? (
                'Loading meals…'
              ) : error ? (
                <span className="text-error">Couldn&apos;t load this week</span>
              ) : plannedCount === 0 ? (
                'No meals planned yet'
              ) : (
                `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned`
              )}
            </span>
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setCopyWeekOpen(true)}
            className="bg-surface-container-lowest px-4 py-2 rounded-lg wireframe-border text-label-md flex items-center gap-2 whitespace-nowrap min-h-[44px] hover:bg-surface-container-low transition-colors"
          >
            <Icon name="content_copy" size={18} />
            Copy Week
          </button>
          <button
            onClick={() => setShoppingListOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-label-md font-semibold flex items-center gap-2 whitespace-nowrap min-h-[44px] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Icon name="shopping_cart" size={18} />
            Shopping List
          </button>
        </div>
      </header>

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
