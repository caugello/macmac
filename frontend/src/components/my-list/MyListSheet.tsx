import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NutriscoreBadge } from '@/components/catalog/NutriscoreBadge'
import { ProductImage } from '@/components/catalog/ProductImage'
import { Icon } from '@/components/ui/icon'
import { useMyList, type MyListItem } from '@/hooks/useMyList'

interface MyListSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * "My List" bottom-sheet overlay matching the Stitch "Ivory Flux" design:
 * a dimmed backdrop and a slide-up sheet (right-side panel on desktop) with a
 * header + count, product rows, an estimated total and an empty state.
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
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade"
      />

      {/* Sheet: bottom-sheet on mobile, right-side panel on desktop */}
      <div
        className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px]
          flex flex-col max-h-[85vh] md:max-h-none md:h-full
          bg-surface-container-lowest/95 backdrop-blur-[20px] ambient-shadow
          rounded-t-2xl md:rounded-none md:rounded-l-2xl animate-enter overflow-hidden"
      >
        {/* Drag handle (mobile affordance) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <span className="block h-1.5 w-10 rounded-full bg-outline-variant" aria-hidden="true" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h2 className="text-title-lg font-heading font-semibold leading-tight">My List</h2>
            <p className="text-caption text-on-surface-variant uppercase tracking-wider mt-0.5">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <button
                type="button"
                onClick={clear}
                className="h-11 px-3 inline-flex items-center gap-1.5 rounded-full text-label-md
                  text-on-surface-variant hover:text-destructive active:scale-95 transition-all"
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
                text-on-surface-variant hover:text-on-surface hover:bg-surface-container active:scale-90 transition-all"
            >
              <Icon name="close" size={24} />
            </button>
          </div>
        </header>

        {/* Body */}
        {count === 0 ? (
          <EmptyState onClose={onClose} />
        ) : (
          <ul className="flex-1 overflow-y-auto no-scrollbar divide-y divide-outline-variant px-2">
            {items.map((item) => (
              <MyListRow key={item.id} item={item} onRemove={() => removeItem(item.id)} />
            ))}
          </ul>
        )}

        {/* Footer: estimated total */}
        {count > 0 && (
          <footer className="shrink-0 border-t border-outline-variant px-5 py-4 bg-surface-container-low/80">
            <div className="flex items-baseline justify-between">
              <span className="text-caption uppercase tracking-wider text-on-surface-variant">
                Estimated total
              </span>
              <span className="text-headline-md font-heading font-bold text-primary">
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
  <li className="flex items-center gap-3 py-3 px-3">
    <Link
      to={`/catalog/${item.id}`}
      className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-surface-container-low"
    >
      <ProductImage src={item.imageUrl} alt={item.name} iconSize={24} />
    </Link>

    <div className="min-w-0 flex-1">
      {item.brand && (
        <span className="block text-caption uppercase tracking-wider text-on-surface-variant truncate">
          {item.brand}
        </span>
      )}
      <Link
        to={`/catalog/${item.id}`}
        className="block text-body-md font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors"
      >
        {item.name}
      </Link>
      <div className="flex items-center gap-2 mt-1">
        {item.price != null ? (
          <span className="text-label-md font-bold text-primary">
            {item.price.toFixed(2)}&nbsp;&euro;
          </span>
        ) : (
          <span className="text-caption text-on-surface-variant">Price unavailable</span>
        )}
        {item.nutriscore && <NutriscoreBadge score={item.nutriscore} size="sm" />}
      </div>
    </div>

    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${item.name} from My List`}
      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full
        text-on-surface-variant hover:text-destructive hover:bg-error-container/40 active:scale-90 transition-all"
    >
      <Icon name="close" size={20} />
    </button>
  </li>
)

const EmptyState = ({ onClose }: { onClose: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16 gap-3">
    <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
      <Icon name="shopping_cart" size={32} className="text-outline-variant" />
    </div>
    <h3 className="text-title-lg font-heading font-semibold">Your list is empty</h3>
    <p className="text-body-md text-on-surface-variant max-w-[28ch]">
      Tap the cart on any product to save it here for later.
    </p>
    <Link
      to="/catalog"
      onClick={onClose}
      className="mt-2 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-on-primary
        font-semibold transition-all hover:-translate-y-px hover:ambient-shadow active:scale-[0.98]"
    >
      <Icon name="menu_book" size={18} />
      Browse the catalog
    </Link>
  </div>
)
