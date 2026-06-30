import { Link } from 'react-router-dom'
import { Card, type CardProps } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'

interface StatTileProps {
  tone: NonNullable<CardProps['tone']>
  label: string
  value: string | number
  unit?: string
  sub?: string
  icon: string
  /** Tailwind text-color class for the corner icon. */
  iconClassName?: string
  to: string
}

/** Compact stat bento tile (screen 01 stat row). */
export const StatTile = ({
  tone,
  label,
  value,
  unit,
  sub,
  icon,
  iconClassName = 'text-ink',
  to,
}: StatTileProps) => {
  return (
    <Link to={to} className="group block h-full">
      <Card
        tone={tone}
        className="flex h-full min-h-[124px] flex-col justify-between p-4 transition-transform group-hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between">
          <span className="font-body text-caption font-bold text-ink/70">{label}</span>
          <Icon name={icon} size={20} className={iconClassName} />
        </div>
        <div>
          <p className="font-display text-[28px] font-extrabold leading-none tracking-tight text-ink">
            {value}
            {unit && <span className="ml-1 text-body-md font-semibold text-ink/40">{unit}</span>}
          </p>
          {sub && <p className="mt-1 font-body text-caption font-medium text-ink/55">{sub}</p>}
        </div>
      </Card>
    </Link>
  )
}
