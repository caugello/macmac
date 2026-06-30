import { useEffect, useRef, useState } from 'react'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { useMealPlans } from '@/hooks/useMealPlans'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MealSlot } from './MealSlot'
import { Icon } from '@/components/ui/icon'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

type ViewMode = 'day' | 'week'

const MEAL_TYPES = [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]

// Slot accent dots, matching screen 02 (amber / green / coral).
const SLOT_DOT: Record<MealTypeEnum, string> = {
  [MealTypeEnum.BREAKFAST]: '#FFD96B',
  [MealTypeEnum.LUNCH]: '#9BD117',
  [MealTypeEnum.DINNER]: '#FF6A3D',
}

const GRID_COLS = '52px repeat(7, minmax(0, 1fr))'

const NavButton = ({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: string
  onClick: () => void
}) => (
  <button
    aria-label={label}
    onClick={onClick}
    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-border text-ink hover:bg-cream transition-colors shrink-0"
  >
    <Icon name={icon} size={19} />
  </button>
)

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
  const todayHeaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewMode !== 'week' || isLoading || todayIndex <= 0) return
    todayHeaderRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [currentWeekStart, isLoading, todayIndex, viewMode])

  const mealPlanMap = new Map<string, MealPlanOut>()
  data?.data.forEach((mp) => {
    mealPlanMap.set(`${mp.date}-${mp.meal_type}`, mp)
  })

  const handlePrevWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1))
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

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
        <div className="h-10 w-64 rounded-full skeleton-shimmer" />
        <div className="h-72 rounded-bento skeleton-shimmer" />
      </div>
    )
  }

  const selectedDay = weekDays[selectedDayIndex]
  const selectedDateStr = format(selectedDay, 'yyyy-MM-dd')
  const isSelectedToday = selectedDateStr === todayStr

  return (
    <div>
      {/* View toggle */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex rounded-full bg-white border border-border p-1 gap-1">
          <button
            onClick={() => setViewMode('day')}
            className={`min-h-[44px] px-5 py-2 rounded-full text-label-md font-semibold transition-colors ${
              viewMode === 'day' ? 'bg-ink text-cream' : 'text-ink hover:bg-cream'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`min-h-[44px] px-5 py-2 rounded-full text-label-md font-semibold transition-colors ${
              viewMode === 'week' ? 'bg-ink text-cream' : 'text-ink hover:bg-cream'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <>
          {/* Week toolbar */}
          <div className="flex items-center gap-3 mb-5">
            <NavButton label="Previous week" icon="chevron_left" onClick={handlePrevWeek} />
            <h2 className="text-title-lg md:text-headline-md font-display font-bold text-ink">
              {format(currentWeekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </h2>
            <NavButton label="Next week" icon="chevron_right" onClick={handleNextWeek} />
            <button
              onClick={handleToday}
              className="ml-1 rounded-xl bg-white border border-border px-3.5 py-2 text-caption font-bold text-on-surface-variant hover:text-ink hover:bg-cream transition-colors"
            >
              Today
            </button>
          </div>

          {/* Matrix: meal rows × day columns (screen 02 desktop) */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="min-w-[720px]">
              {/* Day headers */}
              <div className="grid gap-2" style={{ gridTemplateColumns: GRID_COLS }}>
                <div />
                {weekDays.map((day) => {
                  const isToday = format(day, 'yyyy-MM-dd') === todayStr
                  return (
                    <div
                      key={day.toISOString()}
                      ref={isToday ? todayHeaderRef : undefined}
                      data-today={isToday || undefined}
                      className={`text-center rounded-xl py-1.5 ${isToday ? 'bg-ink' : ''}`}
                    >
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          isToday ? 'text-lime' : 'text-on-surface-variant'
                        }`}
                      >
                        {format(day, 'EEE')}
                      </div>
                      <div
                        className={`text-label-md font-display font-bold ${
                          isToday ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                      {isToday && <span className="sr-only">Today</span>}
                    </div>
                  )
                })}
              </div>

              {/* Meal rows */}
              {MEAL_TYPES.map((mealType) => (
                <div
                  key={mealType}
                  className="grid gap-2 mt-2"
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: SLOT_DOT[mealType] }}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant [writing-mode:vertical-rl] rotate-180">
                      {mealType}
                    </span>
                  </div>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    return (
                      <MealSlot
                        key={`${dateStr}-${mealType}`}
                        date={dateStr}
                        mealType={mealType}
                        mealPlan={mealPlanMap.get(`${dateStr}-${mealType}`)}
                        compact
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Date strip (screen 02 mobile) */}
          <div className="flex gap-1.5 mb-5">
            {weekDays.map((day, i) => {
              const isSelected = i === selectedDayIndex
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDayIndex(i)}
                  aria-label={format(day, 'EEEE, MMM d')}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-ink' : 'text-on-surface-variant'
                    }`}
                  >
                    {format(day, 'EEEEE')}
                  </span>
                  <span
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-label-md font-bold transition-colors ${
                      isSelected ? 'bg-ink text-cream' : 'text-ink'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selected day */}
          <div className="flex items-center justify-between mb-5">
            <NavButton label="Previous day" icon="chevron_left" onClick={handlePrevDay} />
            <div className="text-center">
              <h2 className="text-headline-md font-display font-semibold text-ink">
                {format(selectedDay, 'EEEE, MMM d, yyyy')}
              </h2>
              {isSelectedToday && (
                <span className="inline-block mt-1 text-caption font-semibold px-2.5 py-0.5 rounded-full bg-lime text-ink">
                  Today
                </span>
              )}
            </div>
            <NavButton label="Next day" icon="chevron_right" onClick={handleNextDay} />
          </div>

          <div className="max-w-lg mx-auto space-y-4">
            {MEAL_TYPES.map((mealType) => {
              const isTonightDinner = isSelectedToday && mealType === MealTypeEnum.DINNER
              return (
                <div key={mealType}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: SLOT_DOT[mealType] }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                      {mealType}
                      {isTonightDinner && ' · Tonight'}
                    </span>
                  </div>
                  <MealSlot
                    date={selectedDateStr}
                    mealType={mealType}
                    mealPlan={mealPlanMap.get(`${selectedDateStr}-${mealType}`)}
                    highlight={isTonightDinner}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
