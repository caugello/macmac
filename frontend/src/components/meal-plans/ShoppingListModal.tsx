import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useGenerateShoppingList } from '@/hooks/useMealPlans'
import { useMyList } from '@/hooks/useMyList'
import { IngredientAutocomplete } from '@/components/recipes/IngredientAutocomplete'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@/components/ui/icon'
import type { CatalogItemOut, ShoppingListItem } from '@/lib/types'

interface ShoppingListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekStart: Date
  weekEnd: Date
}

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number } }
    if (axiosError.response?.status === 404) {
      return 'No meals planned for this week. Add some recipes first!'
    }
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      return 'Something went wrong generating your shopping list.'
    }
  }
  return 'Failed to generate shopping list.'
}

const STALE_DAYS = 7

// Returns the price age in days when it is stale (>= STALE_DAYS old), else
// null. The day count drives the visible "price N days old" warning text.
const stalePriceDays = (lastEnrichedAt: string | null): number | null => {
  if (!lastEnrichedAt) return null
  const days = Math.floor((Date.now() - new Date(lastEnrichedAt).getTime()) / 86_400_000)
  return days >= STALE_DAYS ? days : null
}

// Coloured aisle dot per the Pantry Fresh design (screen 05). Unknown
// categories fall back to a neutral dot.
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Produce: '#9BD117',
    'Meat & Fish': '#FF6A3D',
    Meat: '#FF6A3D',
    Fish: '#4FA9D1',
    Dairy: '#F2C94C',
    Bakery: '#E0A458',
    Beverages: '#4FA9D1',
    'Pantry & Other': '#FFB800',
    Pantry: '#FFB800',
  }
  return colors[category] || '#CFCDBE'
}

// "ends 30 Jun" — the promotion end date. Promo savings/percentage are
// intentionally not shown: the catalog has a single price (no pre-promo
// price), and promotions are heading toward a cross-vendor model, not
// single-vendor price history.
const formatPromoEnd = (until: string | null): string | null => {
  if (!until) return null
  try {
    return `ends ${format(parseISO(until), 'd MMM')}`
  } catch {
    return null
  }
}

const lineSubtotal = (items: ShoppingListItem[]): number =>
  items.reduce((sum, item) => sum + (item.line_total ?? 0), 0)

const euro = (value: number | null): string =>
  value != null && value > 0 ? `€${value.toFixed(2)}` : '—'

// Long categories collapse to this many rows with a "+ N more" toggle.
const COLLAPSE_VISIBLE = 5

const UNAVAILABLE_CATEGORY = 'Unavailable'

export const ShoppingListModal = ({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
}: ShoppingListModalProps) => {
  const generateMutation = useGenerateShoppingList()
  const { mutate, reset, data, isPending, isError, error } = generateMutation
  const { addItem } = useMyList()

  // The list defaults to the planner week but the range is editable in-modal.
  const [range, setRange] = useState({ start: weekStart, end: weekEnd })
  // Local, session-only check-off state keyed by catalog item id.
  const [checked, setChecked] = useState<Set<string>>(new Set())
  // Categories the user expanded past the "+ N more" collapse.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const generate = (start: Date = range.start, end: Date = range.end) => {
    mutate({
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
    })
  }

  const handleRangeChange = (which: 'start' | 'end', value: string) => {
    if (!value) return
    const next = { ...range, [which]: parseISO(value) }
    setRange(next)
    generate(next.start, next.end)
  }

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpanded = (category: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  // Add a catalog product as an extra without leaving the modal. Extras are
  // sourced server-side from My List, so wait for the add to persist before
  // regenerating — otherwise the refreshed list would miss the new item.
  // Re-adding the same product is a no-op (My List + backend extras dedup).
  const handleAddExtra = async (item: CatalogItemOut) => {
    await addItem({
      id: item.id,
      name: item.canonical_name || item.raw_name,
      brand: item.brand,
      price: item.price,
      imageUrl: item.image_url,
      nutriscore: item.nutriscore,
    })
    generate()
  }

  // Generate when the modal opens; reset when it closes.
  useEffect(() => {
    if (open) {
      generate()
    } else {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handlePrint = () => {
    window.print()
  }

  // Order categories with the "Unavailable" bucket last.
  const categories = useMemo(() => {
    if (!data) return []
    return Object.entries(data.items_by_category).sort(([a], [b]) => {
      if (a === UNAVAILABLE_CATEGORY) return 1
      if (b === UNAVAILABLE_CATEGORY) return -1
      return a.localeCompare(b)
    })
  }, [data])

  // "checked / total" indicator counts only the purchasable, checkable list
  // lines (extras have no checkbox, matching the design).
  const { checkedCount, checkableTotal } = useMemo(() => {
    if (!data) return { checkedCount: 0, checkableTotal: 0 }
    const ids = Object.values(data.items_by_category)
      .flat()
      .filter((item) => !item.is_unavailable)
      .map((item) => item.catalog_item_id)
    return {
      checkedCount: ids.filter((id) => checked.has(id)).length,
      checkableTotal: ids.length,
    }
  }, [data, checked])

  const renderItemRow = (item: ShoppingListItem) => {
    if (item.is_unavailable) {
      return (
        <div
          key={item.catalog_item_id}
          className="flex items-center justify-between gap-3 py-3 border-b border-[#F0EEE3] last:border-b-0 print:py-1 print:border-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="error_outline" size={18} className="text-ink/40 shrink-0" />
            <span className="text-label-md font-display font-semibold text-ink/50 italic print:text-black">
              {item.catalog_item_name}
            </span>
          </div>
        </div>
      )
    }

    const isChecked = checked.has(item.catalog_item_id)
    const promoEnd = formatPromoEnd(item.promotion_until_date)
    const staleDays = stalePriceDays(item.last_enriched_at)

    return (
      <div
        key={item.catalog_item_id}
        className={`flex items-center gap-2 py-3 border-b border-[#F0EEE3] last:border-b-0 print:py-1 print:border-0 ${
          isChecked ? 'opacity-60' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => toggleChecked(item.catalog_item_id)}
          aria-pressed={isChecked}
          aria-label={`Mark ${item.catalog_item_name} as in cart`}
          className="shrink-0 grid place-items-center h-11 w-11 -my-1 rounded-full hover:bg-white print:hidden"
        >
          <Icon
            name={isChecked ? 'check_box' : 'check_box_outline_blank'}
            size={22}
            className={isChecked ? 'text-lime' : 'text-ink/30'}
          />
        </button>
        <div className="flex items-center flex-wrap gap-y-1 min-w-0 flex-1">
          <span
            className={`text-label-md font-display font-semibold print:text-black ${
              isChecked ? 'text-ink/50 line-through' : 'text-ink'
            }`}
          >
            {item.catalog_item_name}
          </span>
          <span className="text-caption text-ink/60 ml-2 print:text-black">
            {item.total_qty} {item.unit}
          </span>
          {item.packages_needed != null && (
            <span className="text-caption text-ink/45 ml-1 print:text-black">
              &mdash; buy {item.packages_needed} x {item.package_size}
              {item.package_unit}
            </span>
          )}
          {isChecked && (
            <span className="text-caption text-lime ml-2 font-semibold print:hidden">
              · in cart
            </span>
          )}
          {item.is_on_promotion && (
            <span className="ml-2 inline-flex items-center gap-1 bg-coral text-white text-xs px-2 py-0.5 rounded-full font-semibold print:hidden">
              <Icon name="local_offer" size={12} />
              PROMO
            </span>
          )}
          {item.is_on_promotion && promoEnd && (
            <span className="text-caption ml-1.5 font-semibold text-[#C26A00] print:text-black">
              · {promoEnd}
            </span>
          )}
          {staleDays != null && (
            <span className="ml-2 inline-flex items-center gap-1 text-[#D14F3A] text-caption font-bold print:hidden">
              <Icon name="warning" size={14} />
              price {staleDays} days old
            </span>
          )}
        </div>
        {item.line_total != null && (
          <span className="text-label-md font-display font-bold text-ink shrink-0 print:text-black">
            &euro;{item.line_total.toFixed(2)}
          </span>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-print-region
        className="sm:max-w-2xl lg:max-w-5xl bg-cream border-transparent rounded-bento"
        aria-describedby={undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-headline-md font-display font-bold text-ink">
                Shopping List
              </DialogTitle>
              {data && (
                <p className="text-caption text-ink/60 mt-0.5">
                  {data.total_items} items · est. {euro(data.estimated_total)}
                </p>
              )}
            </div>
            {data && checkableTotal > 0 && (
              <span className="text-caption bg-white text-ink/70 px-3 py-1 rounded-full">
                {checkedCount} / {checkableTotal} in cart
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-caption text-ink/70">
              <span className="sr-only">Start date</span>
              <input
                type="date"
                aria-label="Start date"
                value={format(range.start, 'yyyy-MM-dd')}
                onChange={(e) => handleRangeChange('start', e.target.value)}
                className="h-11 px-2 rounded-xl bg-white border border-border text-ink text-caption"
              />
            </label>
            <span className="text-ink/40">&ndash;</span>
            <label className="flex items-center gap-1.5 text-caption text-ink/70">
              <span className="sr-only">End date</span>
              <input
                type="date"
                aria-label="End date"
                value={format(range.end, 'yyyy-MM-dd')}
                onChange={(e) => handleRangeChange('end', e.target.value)}
                className="h-11 px-2 rounded-xl bg-white border border-border text-ink text-caption"
              />
            </label>
            {data && (
              <button
                onClick={handlePrint}
                className="h-11 px-4 inline-flex items-center gap-2 rounded-full bg-ink text-cream text-label-md hover:-translate-y-px active:scale-[0.98] transition-all"
              >
                <Icon name="print" size={18} />
                Print
              </button>
            )}
          </div>
        </div>

        <h2 className="hidden print:block text-2xl font-bold mb-2">
          Shopping List &mdash; {format(range.start, 'MMM d')} to {format(range.end, 'MMM d, yyyy')}
        </h2>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-ink/60">
            <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            Generating...
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{getErrorMessage(error)}</span>
              <button
                onClick={() => generate()}
                className="ml-4 underline font-semibold whitespace-nowrap"
              >
                Try again
              </button>
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="lg:flex lg:items-start lg:gap-5 print:block">
            {/* List column */}
            <div className="space-y-4 lg:flex-[1.7] min-w-0">
              {categories.map(([category, items]) => {
                const isCollapsible = items.length > COLLAPSE_VISIBLE && !expanded.has(category)
                const visibleItems = isCollapsible ? items.slice(0, COLLAPSE_VISIBLE) : items
                const hiddenCount = items.length - visibleItems.length
                const subtotal = lineSubtotal(items)
                return (
                  <div
                    key={category}
                    className="bg-white rounded-[18px] overflow-hidden print:border-0 print:bg-transparent"
                  >
                    <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-border print:border-0 print:px-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      <h3 className="text-label-md text-ink tracking-normal font-display font-extrabold print:text-black">
                        {category || 'Other'}
                      </h3>
                      <span className="text-caption text-ink/45">{items.length} items</span>
                      {category !== UNAVAILABLE_CATEGORY && subtotal > 0 && (
                        <span className="ml-auto text-label-md font-display font-bold text-ink print:text-black">
                          €{subtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="px-4 md:px-6 print:px-0">
                      {visibleItems.map(renderItemRow)}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(category)}
                          className="w-full text-left text-caption text-ink/60 py-3 hover:text-ink print:hidden"
                        >
                          + {hiddenCount} more in {category}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary + Extras rail */}
            <aside className="space-y-4 mt-4 lg:mt-0 lg:flex-1 lg:sticky lg:top-2 self-start min-w-0 print:mt-4">
              <div className="bg-white rounded-[18px] p-5 print:border-0 print:bg-transparent print:p-0">
                <h3 className="text-title-lg font-display font-bold text-ink mb-4 print:text-black">
                  Estimated total
                </h3>
                <div className="space-y-2 mb-4">
                  {categories
                    .filter(([category]) => category !== UNAVAILABLE_CATEGORY)
                    .map(([category, items]) => (
                      <div key={category} className="flex justify-between text-caption">
                        <span className="text-ink/70">
                          {category || 'Other'} · {items.length}
                        </span>
                        <span className="font-display font-bold text-ink">
                          {euro(lineSubtotal(items))}
                        </span>
                      </div>
                    ))}
                  {data.extras.length > 0 && (
                    <div className="flex justify-between text-caption">
                      <span className="text-ink/70">Extras · {data.extras.length}</span>
                      <span className="font-display font-bold text-ink">
                        {euro(lineSubtotal(data.extras))}
                      </span>
                    </div>
                  )}
                </div>
                <div className="h-px bg-border mb-3" />
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-label-md font-semibold text-ink">Estimated total</span>
                  <span className="text-headline-md font-display font-bold text-ink print:text-black">
                    {euro(data.estimated_total)}
                  </span>
                </div>
                <button
                  onClick={handlePrint}
                  className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-ink text-cream text-label-md font-semibold hover:-translate-y-px active:scale-[0.99] transition-all print:hidden"
                >
                  <Icon name="print" size={19} className="text-lime" />
                  Print list
                </button>
              </div>

              <div className="bg-white rounded-[18px] overflow-hidden print:border-0 print:bg-transparent">
                <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border print:border-0 print:px-0">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-yellow text-ink shrink-0 print:hidden">
                      <Icon name="add_shopping_cart" size={18} />
                    </span>
                    <h3 className="text-label-md text-ink tracking-normal font-display font-extrabold print:text-black">
                      Extras
                    </h3>
                  </div>
                  {data.extras.length > 0 && (
                    <span className="text-caption bg-cream text-ink/70 px-3 py-1 rounded-full print:hidden">
                      {data.extras.length}
                    </span>
                  )}
                </div>
                <div className="px-4 md:px-6 print:px-0">
                  {/* Inline catalog search: add an extra to My List without
                      leaving the modal. The popover overlays (no layout shift)
                      and is hidden when printing. */}
                  <div className="py-3 print:hidden">
                    <IngredientAutocomplete
                      onSelect={handleAddExtra}
                      placeholder="Add from catalog..."
                    />
                  </div>
                  {data.extras.map((item) => {
                    const promoEnd = formatPromoEnd(item.promotion_until_date)
                    const staleDays = stalePriceDays(item.last_enriched_at)
                    return (
                      <div
                        key={item.catalog_item_id}
                        className="flex items-center justify-between gap-3 py-3 border-b border-[#F0EEE3] last:border-b-0 print:py-1 print:border-0"
                      >
                        <div className="flex items-center flex-wrap gap-y-1 min-w-0">
                          <span className="text-label-md font-display font-semibold text-ink print:text-black">
                            {item.catalog_item_name}
                          </span>
                          {item.total_qty != null && item.unit && (
                            <span className="text-caption text-ink/60 ml-2 print:text-black">
                              {item.total_qty} {item.unit}
                            </span>
                          )}
                          {item.is_on_promotion && (
                            <span className="ml-2 inline-flex items-center gap-1 bg-coral text-white text-xs px-2 py-0.5 rounded-full font-semibold print:hidden">
                              <Icon name="local_offer" size={12} />
                              PROMO
                            </span>
                          )}
                          {item.is_on_promotion && promoEnd && (
                            <span className="text-caption ml-1.5 font-semibold text-[#C26A00] print:text-black">
                              · {promoEnd}
                            </span>
                          )}
                          {staleDays != null && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[#D14F3A] text-caption font-bold print:hidden">
                              <Icon name="warning" size={14} />
                              price {staleDays} days old
                            </span>
                          )}
                        </div>
                        {item.line_total != null && (
                          <span className="text-label-md font-display font-bold text-ink shrink-0 print:text-black">
                            &euro;{item.line_total.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
