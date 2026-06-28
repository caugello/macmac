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
  const greeting = timeOfDayGreeting(new Date())
  const taskLabel =
    todayCount === 0
      ? 'Nothing planned for today yet'
      : `${todayCount} ${todayCount === 1 ? 'meal' : 'meals'} planned for today`

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="font-serif text-body-lg italic text-ink/50">
          MacMac<span className="text-green">.</span>
        </p>
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg font-bold text-ink">
          {greeting}, {name}
        </h1>
        <p className="font-body text-body-md text-ink/60 flex items-center gap-1.5">
          <Icon name="event_available" size={18} className="text-green" />
          {taskLabel}
        </p>
      </div>
      <div className="w-12 h-12 rounded-full bg-lime flex items-center justify-center shrink-0">
        <Icon name="person" size={26} className="text-ink" filled />
      </div>
    </header>
  )
}
