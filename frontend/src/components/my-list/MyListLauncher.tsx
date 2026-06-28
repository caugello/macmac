import { useState } from 'react'
import { Fab } from '@/components/ui/fab'
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
      <Fab
        icon="shopping_cart"
        count={count}
        filled={count > 0}
        onClick={() => setOpen(true)}
        aria-label={`Open My List, ${count} ${count === 1 ? 'item' : 'items'}`}
        className="right-4 bottom-20 md:bottom-6"
      />

      <MyListSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
