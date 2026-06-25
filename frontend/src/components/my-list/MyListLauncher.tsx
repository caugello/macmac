import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { useMyList } from '@/hooks/useMyList'
import { MyListSheet } from './MyListSheet'

/**
 * Global launcher for "My List": a floating action button with a live count
 * badge that opens the bottom-sheet overlay. Sits above the mobile BottomNav.
 */
export const MyListLauncher = () => {
  const [open, setOpen] = useState(false)
  const { count } = useMyList()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open My List, ${count} ${count === 1 ? 'item' : 'items'}`}
        className="fixed right-4 bottom-20 md:bottom-6 z-50 w-14 h-14 inline-flex items-center justify-center
          rounded-full bg-primary text-on-primary ambient-shadow
          transition-all hover:-translate-y-px active:scale-90"
      >
        <Icon name="shopping_cart" size={26} filled={count > 0} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 inline-flex items-center justify-center
              rounded-full bg-surface-container-lowest text-primary text-caption font-bold border border-outline-variant"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <MyListSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
