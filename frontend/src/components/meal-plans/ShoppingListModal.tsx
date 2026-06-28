import { useEffect } from 'react'
import { format } from 'date-fns'
import { useGenerateShoppingList } from '@/hooks/useMealPlans'
import { useMyList } from '@/hooks/useMyList'
import { IngredientAutocomplete } from '@/components/recipes/IngredientAutocomplete'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@/components/ui/icon'
import type { CatalogItemOut } from '@/lib/types'

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

const isPriceStale = (lastEnrichedAt: string | null): boolean => {
  if (!lastEnrichedAt) return false
  const days = Math.floor((Date.now() - new Date(lastEnrichedAt).getTime()) / 86_400_000)
  return days >= STALE_DAYS
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    Dairy: 'egg',
    Produce: 'eco',
    Meat: 'set_meal',
    Bakery: 'bakery_dining',
    Beverages: 'local_cafe',
  }
  return icons[category] || 'category'
}

export const ShoppingListModal = ({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
}: ShoppingListModalProps) => {
  const generateMutation = useGenerateShoppingList()
  const { mutate, reset, data, isPending, isError, error } = generateMutation
  const { addItem } = useMyList()

  const generate = () => {
    mutate({
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd'),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-print-region
        className="sm:max-w-2xl bg-cream border-transparent rounded-bento"
        aria-describedby={undefined}
      >
        <div className="flex items-center justify-between gap-4 print:hidden">
          <DialogTitle className="text-headline-md font-display font-bold text-ink">
            Shopping List
          </DialogTitle>
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

        <h2 className="hidden print:block text-2xl font-bold mb-2">
          Shopping List &mdash; {format(weekStart, 'MMM d')} to {format(weekEnd, 'MMM d, yyyy')}
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
              <button onClick={generate} className="ml-4 underline font-semibold whitespace-nowrap">
                Try again
              </button>
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="space-y-4">
            {Object.entries(data.items_by_category).map(([category, items]) => (
              <div
                key={category}
                className="bg-white rounded-bento border border-border overflow-hidden print:border-0 print:bg-transparent"
              >
                <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border print:border-0 print:px-0">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-lime text-ink shrink-0 print:hidden">
                      <Icon name={getCategoryIcon(category)} size={18} />
                    </span>
                    <h3 className="text-label-md text-ink uppercase tracking-wider font-display font-bold print:text-black">
                      {category || 'Other'}
                    </h3>
                  </div>
                  <span className="text-caption bg-cream text-ink/70 px-3 py-1 rounded-full print:hidden">
                    {items.length}
                  </span>
                </div>
                <div className="p-3 md:p-4 space-y-2 print:p-0 print:space-y-0">
                  {items.map((item) => (
                    <div
                      key={item.catalog_item_id}
                      className="flex items-center justify-between gap-3 p-3 bg-cream rounded-2xl print:p-1 print:bg-transparent"
                    >
                      <div className="flex items-center flex-wrap gap-y-1 min-w-0">
                        <span className="text-label-md font-display font-semibold text-ink print:text-black">
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
                        {item.is_on_promotion && (
                          <span className="ml-2 inline-flex items-center gap-1 bg-coral text-white text-xs px-2 py-0.5 rounded-full font-semibold print:hidden">
                            <Icon name="local_offer" size={12} />
                            Promo
                          </span>
                        )}
                        {isPriceStale(item.last_enriched_at) && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-coral text-xs print:hidden"
                            title="Price may be outdated"
                          >
                            <Icon name="warning" size={14} />
                          </span>
                        )}
                      </div>
                      {item.line_total != null && (
                        <span className="text-label-md font-display font-bold text-ink shrink-0 print:text-black">
                          &euro;{item.line_total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-bento border border-border overflow-hidden print:border-0 print:bg-transparent">
              <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border print:border-0 print:px-0">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-yellow text-ink shrink-0 print:hidden">
                    <Icon name="add_shopping_cart" size={18} />
                  </span>
                  <h3 className="text-label-md text-ink uppercase tracking-wider font-display font-bold print:text-black">
                    Extras
                  </h3>
                </div>
                {data.extras.length > 0 && (
                  <span className="text-caption bg-cream text-ink/70 px-3 py-1 rounded-full print:hidden">
                    {data.extras.length}
                  </span>
                )}
              </div>
              <div className="p-3 md:p-4 space-y-2 print:p-0 print:space-y-0">
                {/* Inline catalog search: add an extra to My List without
                    leaving the modal. The popover overlays (no layout shift)
                    and is hidden when printing. */}
                <div className="print:hidden">
                  <IngredientAutocomplete
                    onSelect={handleAddExtra}
                    placeholder="Search catalog to add an extra..."
                  />
                </div>
                {data.extras.map((item) => (
                  <div
                    key={item.catalog_item_id}
                    className="flex items-center justify-between gap-3 p-3 bg-cream rounded-2xl print:p-1 print:bg-transparent"
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
                      {item.packages_needed != null && (
                        <span className="text-caption text-ink/45 ml-1 print:text-black">
                          &mdash; buy {item.packages_needed} x {item.package_size}
                          {item.package_unit}
                        </span>
                      )}
                      {item.is_on_promotion && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-coral text-white text-xs px-2 py-0.5 rounded-full font-semibold print:hidden">
                          <Icon name="local_offer" size={12} />
                          Promo
                        </span>
                      )}
                      {isPriceStale(item.last_enriched_at) && (
                        <span
                          className="ml-2 inline-flex items-center gap-1 text-coral text-xs print:hidden"
                          title="Price may be outdated"
                        >
                          <Icon name="warning" size={14} />
                        </span>
                      )}
                    </div>
                    {item.line_total != null && (
                      <span className="text-label-md font-display font-bold text-ink shrink-0 print:text-black">
                        &euro;{item.line_total.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ink text-cream p-5 rounded-bento flex flex-col sm:flex-row gap-4 sm:gap-8 print:border-0 print:bg-transparent print:text-black print:p-0">
              <div>
                <span className="text-caption text-cream/70 uppercase tracking-wider block print:text-black">
                  Total Items
                </span>
                <span className="text-headline-md font-display font-bold print:text-black">
                  {data.total_items}
                </span>
              </div>
              <div>
                <span className="text-caption text-cream/70 uppercase tracking-wider block print:text-black">
                  Estimated Total
                </span>
                <span className="text-headline-md font-display font-bold text-lime print:text-black">
                  {data.estimated_total ? `€${data.estimated_total.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
