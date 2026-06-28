import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductImage } from '@/components/catalog/ProductImage'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useMyList, type MyListItem } from '@/hooks/useMyList'

interface MyListSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * "My List" overlay restyled to the Pantry Fresh bento system: a dimmed backdrop
 * and a cream sheet (mobile bottom-sheet / desktop right panel) with a header +
 * count, white bento product rows, an estimated total and an empty state.
 *
 * Client-side only: the list lives in localStorage via `useMyList`.
 */
export const MyListSheet = ({ open, onClose }: MyListSheetProps) => {
  const { items, count, removeItem, clear } = useMyList()

  // Esc to close.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const estimatedTotal = items.reduce((sum, item) => sum + (item.price ?? 0), 0)
  const hasPrices = items.some((item) => item.price != null)

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="My List">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close My List"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-fade"
      />

      {/* Sheet: bottom-sheet on mobile, right-side panel on desktop */}
      <div
        className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px]
          flex flex-col max-h-[85vh] md:max-h-none md:h-full
          bg-cream ambient-shadow
          rounded-t-bento md:rounded-none md:rounded-l-bento animate-enter overflow-hidden"
      >
        {/* Drag handle (mobile affordance) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <span className="block h-1.5 w-10 rounded-full bg-ink/15" aria-hidden="true" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-title-lg font-display font-bold text-ink leading-tight">My List</h2>
            <p className="text-caption text-ink/60 uppercase tracking-wider mt-0.5">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <button
                type="button"
                onClick={clear}
                className="h-11 px-3 inline-flex items-center gap-1.5 rounded-full text-label-md
                  text-ink/60 hover:text-coral active:scale-95 transition-all"
              >
                <Icon name="delete_sweep" size={20} />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="w-11 h-11 inline-flex items-center justify-center rounded-full
                text-ink/60 hover:text-ink hover:bg-ink/5 active:scale-90 transition-all"
            >
              <Icon name="close" size={24} />
            </button>
          </div>
        </header>

        {/* Body */}
        {count === 0 ? (
          <EmptyState onClose={onClose} />
        ) : (
          <ul className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 px-3 pb-2">
            {items.map((item) => (
              <MyListRow key={item.id} item={item} onRemove={() => removeItem(item.id)} />
            ))}
          </ul>
        )}

        {/* Footer: estimated total */}
        {count > 0 && (
          <footer className="shrink-0 p-3">
            <div className="flex items-center justify-between gap-3 rounded-bento bg-ink text-cream px-5 py-4">
              <span className="text-caption uppercase tracking-wider text-cream/70">
                Estimated total
              </span>
              <span className="text-headline-md font-display font-bold text-lime">
                {hasPrices ? <>{estimatedTotal.toFixed(2)}&nbsp;&euro;</> : <>&mdash;</>}
              </span>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

const MyListRow = ({ item, onRemove }: { item: MyListItem; onRemove: () => void }) => (
  <li className="flex items-center gap-3 rounded-bento border border-border bg-white p-3">
    <Link
      to={`/catalog/${item.id}`}
      className="w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-cream"
    >
      <ProductImage src={item.imageUrl} alt={item.name} iconSize={24} />
    </Link>

    <div className="min-w-0 flex-1">
      {item.brand && (
        <span className="block text-caption uppercase tracking-wider text-ink/50 truncate">
          {item.brand}
        </span>
      )}
      <Link
        to={`/catalog/${item.id}`}
        className="block text-body-md font-display font-semibold text-ink leading-tight line-clamp-2 hover:text-coral transition-colors"
      >
        {item.name}
      </Link>
      <div className="flex items-center gap-2 mt-1">
        {item.price != null ? (
          <span className="text-label-md font-display font-bold text-ink">
            {item.price.toFixed(2)}&nbsp;&euro;
          </span>
        ) : (
          <span className="text-caption text-ink/50">Price unavailable</span>
        )}
        {item.nutriscore && <NutriscoreBadge score={item.nutriscore} size="sm" />}
      </div>
    </div>

    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${item.name} from My List`}
      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full
        text-ink/50 hover:text-coral hover:bg-coral/10 active:scale-90 transition-all"
    >
      <Icon name="close" size={20} />
    </button>
  </li>
)

const EmptyState = ({ onClose }: { onClose: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16 gap-3">
    <div className="w-16 h-16 rounded-full bg-lime flex items-center justify-center">
      <Icon name="shopping_cart" size={32} className="text-ink" />
    </div>
    <h3 className="text-title-lg font-display font-bold text-ink">Your list is empty</h3>
    <p className="text-body-md text-ink/60 max-w-[28ch]">
      Tap the cart on any product to save it here for later.
    </p>
    <Button asChild className="mt-2">
      <Link to="/catalog" onClick={onClose}>
        <Icon name="menu_book" size={18} className="mr-2" />
        Browse the catalog
      </Link>
    </Button>
  </div>
)
