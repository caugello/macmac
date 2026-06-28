import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

const fabVariants = cva(
  'fixed z-50 inline-flex items-center justify-center rounded-full ambient-shadow transition-all hover:-translate-y-px active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      tone: {
        primary: 'bg-primary text-primary-foreground',
        accent: 'bg-lime text-ink',
      },
      size: {
        default: 'w-14 h-14',
        lg: 'w-16 h-16',
      },
    },
    defaultVariants: {
      tone: 'primary',
      size: 'default',
    },
  }
)

export interface FabProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof fabVariants> {
  /** Material Symbol name. */
  icon: string
  /** Optional live count rendered as a corner badge. */
  count?: number
  /** Fill the icon glyph. */
  filled?: boolean
}

/**
 * Floating action button for the Pantry Fresh system: a round accent button
 * with an optional count badge. Position is supplied by the caller via
 * `className` (e.g. `right-4 bottom-20`), so it adapts to each screen.
 */
export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ icon, count, filled, tone, size, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(fabVariants({ tone, size }), className)}
      {...props}
    >
      <Icon name={icon} size={26} filled={filled} />
      {count != null && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 inline-flex items-center justify-center
            rounded-full border border-border bg-white text-ink text-caption font-bold"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
)
Fab.displayName = 'Fab'
