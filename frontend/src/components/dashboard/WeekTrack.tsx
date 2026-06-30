import { Link } from 'react-router-dom'
import { addDays, format, isSameDay, isToday, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { MealTypeEnum, type MealPlanOut } from '@/lib/types'

// Stacked bars per day mirror screen 01: breakfast / lunch / dinner.
const SLOT_ORDER = [MealTypeEnum.BREAKFAST, MealTypeEnum.LUNCH, MealTypeEnum.DINNER]
const SLOT_COLOR: Record<MealTypeEnum, string> = {
  [MealTypeEnum.BREAKFAST]: 'bg-yellow',
  [MealTypeEnum.LUNCH]: 'bg-green',
  [MealTypeEnum.DINNER]: 'bg-coral',
}

interface WeekTrackProps {
  weekStart: Date
  meals: MealPlanOut[]
}

/** "Your week" bento tile (screen 01): a 7-day track of planned meal slots. */
export const WeekTrack = ({ weekStart, meals }: WeekTrackProps) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const slotsFor = (day: Date) =>
    new Set(meals.filter((m) => isSameDay(parseISO(m.date), day)).map((m) => m.meal_type))

  return (
    <Card tone="white" className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-label-md font-bold text-ink">Your week</h2>
        <Link
          to="/meal-plans"
          className="flex items-center gap-1 font-body text-caption font-bold text-ink/60 transition-colors hover:text-ink"
        >
          Planner
          <Icon name="arrow_forward" size={15} />
        </Link>
      </div>
      <div className="flex flex-1 gap-1.5">
        {days.map((day) => {
          const slots = slotsFor(day)
          const today = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={
                today
                  ? 'flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-ink py-2'
                  : 'flex flex-1 flex-col items-center gap-1.5'
              }
            >
              <span
                className={
                  today
                    ? 'font-body text-[10px] font-bold uppercase text-lime'
                    : 'font-body text-[10px] font-bold uppercase text-ink/35'
                }
              >
                {format(day, 'EEEEE')}
              </span>
              <span
                className={
                  today
                    ? 'font-display text-label-md font-extrabold text-white'
                    : 'font-display text-label-md font-bold text-ink'
                }
              >
                {format(day, 'd')}
              </span>
              <div className={today ? 'flex w-[70%] flex-col gap-1' : 'flex w-full flex-col gap-1'}>
                {SLOT_ORDER.map((slot) => (
                  <span
                    key={slot}
                    className={`h-1.5 rounded-full ${slots.has(slot) ? SLOT_COLOR[slot] : 'bg-[#e7e6dc]'}`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
