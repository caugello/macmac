import { useEffect, useRef, useState } from 'react'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MealSlot } from './MealSlot'
import { Icon } from '@/components/ui/icon'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

type ViewMode = 'day' | 'week'

const MEAL_TYPES = [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]

const DayCard = ({
  day,
  isToday,
  mealPlanMap,
  cardRef,
  className,
}: {
  day: Date
  isToday: boolean
  mealPlanMap: Map<string, MealPlanOut>
  cardRef?: React.Ref<HTMLDivElement>
  className?: string
}) => {
  const dateStr = format(day, 'yyyy-MM-dd')
  return (
    <div
      ref={cardRef}
      className={`bg-surface-container-lowest rounded-lg wireframe-border overflow-hidden ${
        isToday ? 'ring-2 ring-primary shadow-lg' : ''
      } ${className ?? ''}`}
    >
      <div className="bg-primary/5 px-4 py-3 border-b border-outline-variant/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-headline-md-mobile font-heading font-semibold text-primary">
              {format(day, 'EEE')}
            </span>
            <span className="text-label-sm text-on-surface-variant ml-2">
              {format(day, 'MMM d')}
            </span>
          </div>
          {isToday && (
            <span className="text-label-sm font-medium px-2 py-0.5 rounded-full bg-primary text-on-primary">
              Today
            </span>
          )}
        </div>
        <button className="p-1 text-on-surface-variant hover:text-primary transition-colors">
          <Icon name="more_vert" size={18} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {MEAL_TYPES.map((mealType) => (
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
}

export const WeeklyCalendar = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [viewMode, setViewMode] = useState<ViewMode>(isDesktop ? 'week' : 'day')
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date()
    return today.getDay() === 0 ? 6 : today.getDay() - 1
  })

  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekEnd = addDays(currentWeekStart, 6)

  const { data, isLoading } = useMealPlans({
    start_date: format(currentWeekStart, 'yyyy-MM-dd'),
    end_date: format(weekEnd, 'yyyy-MM-dd'),
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayIndex = weekDays.findIndex((day) => format(day, 'yyyy-MM-dd') === todayStr)
  const todayCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewMode !== 'week' || isLoading || todayIndex <= 0) return
    todayCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [currentWeekStart, isLoading, todayIndex, viewMode])

  const mealPlanMap = new Map<string, MealPlanOut>()
  data?.data.forEach((mp) => {
    const key = `${mp.date}-${mp.meal_type}`
    mealPlanMap.set(key, mp)
  })

  const handlePrevWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1))
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1))

  const handlePrevDay = () => {
    if (selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1)
    } else {
      setCurrentWeekStart(addWeeks(currentWeekStart, -1))
      setSelectedDayIndex(6)
    }
  }

  const handleNextDay = () => {
    if (selectedDayIndex < 6) {
      setSelectedDayIndex(selectedDayIndex + 1)
    } else {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1))
      setSelectedDayIndex(0)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 mx-auto rounded skeleton-shimmer" />
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-7 md:overflow-x-visible md:snap-none md:pb-0">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="min-w-[85vw] snap-center md:min-w-0 h-64 rounded-lg skeleton-shimmer"
            />
          ))}
        </div>
      </div>
    )
  }

  const selectedDay = weekDays[selectedDayIndex]
  const selectedDateStr = format(selectedDay, 'yyyy-MM-dd')
  const isSelectedToday = selectedDateStr === todayStr

  return (
    <div>
      {/* View toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-lg wireframe-border overflow-hidden">
          <button
            onClick={() => setViewMode('day')}
            className={`min-h-[44px] px-5 py-2 text-label-md font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`min-h-[44px] px-5 py-2 text-label-md font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {viewMode === 'day' ? (
        <>
          {/* Day navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevDay}
              className="w-10 h-10 flex items-center justify-center rounded-full wireframe-border hover:bg-surface-container-low transition-colors"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <h2 className="text-headline-md font-heading font-semibold">
              {format(selectedDay, 'EEEE, MMM d, yyyy')}
            </h2>
            <button
              onClick={handleNextDay}
              className="w-10 h-10 flex items-center justify-center rounded-full wireframe-border hover:bg-surface-container-low transition-colors"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          <div className="max-w-lg mx-auto">
            <DayCard day={selectedDay} isToday={isSelectedToday} mealPlanMap={mealPlanMap} />
          </div>
        </>
      ) : (
        <>
          {/* Week navigation */}
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

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-7 md:overflow-x-visible md:snap-none md:pb-0 stagger-grid">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const isToday = dateStr === todayStr
              return (
                <DayCard
                  key={day.toISOString()}
                  day={day}
                  isToday={isToday}
                  mealPlanMap={mealPlanMap}
                  cardRef={isToday ? todayCardRef : undefined}
                  className="min-w-[85vw] snap-center md:min-w-0"
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
