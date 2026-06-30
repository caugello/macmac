import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'

interface GreetingHeaderProps {
  name: string
  /** Number of meals planned for today (real data). */
  todayCount: number
}

const timeOfDayGreeting = (date: Date) => {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export const GreetingHeader = ({ name, todayCount }: GreetingHeaderProps) => {
  const now = new Date()
  const greeting = timeOfDayGreeting(now)
  const todayLabel =
    todayCount === 0
      ? 'nothing planned yet'
      : `${todayCount} ${todayCount === 1 ? 'meal' : 'meals'} today`

  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-headline-lg-mobile font-bold leading-none tracking-tight text-ink md:text-headline-lg">
          {greeting}, {name}
        </h1>
        <p className="mt-2 font-body text-body-md text-ink/55">
          {format(now, 'EEEE, MMMM d')} · {todayLabel}
        </p>
      </div>
      <Link
        to="/recipes/new"
        className="hidden min-h-[44px] items-center gap-2 rounded-2xl bg-ink px-4 py-3 font-body text-label-md font-bold text-cream transition-transform hover:-translate-y-px sm:flex"
      >
        <Icon name="add" size={19} className="text-lime" />
        New recipe
      </Link>
    </header>
  )
}
