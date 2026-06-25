import { useEffect } from 'react'
import { format } from 'date-fns'
import { useGenerateShoppingList } from '@/hooks/useMealPlans'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@/components/ui/icon'

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

  const generate = () => {
    mutate({
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd'),
    })
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
      <DialogContent data-print-region className="sm:max-w-2xl" aria-describedby={undefined}>
        <div className="flex items-center justify-between gap-4 print:hidden">
          <DialogTitle className="text-headline-md font-heading">Shopping List</DialogTitle>
          {data && (
            <button
              onClick={handlePrint}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
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
          <div className="flex items-center justify-center gap-2 py-12 text-on-surface-variant">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                className="bg-surface-container-lowest rounded-lg wireframe-border overflow-hidden print:border-0 print:bg-transparent"
              >
                <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-primary/5 border-b border-outline-variant/50 print:bg-transparent print:px-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={getCategoryIcon(category)}
                      size={20}
                      className="text-primary print:hidden"
                    />
                    <h3 className="text-label-md text-primary uppercase tracking-wider font-semibold print:text-black">
                      {category || 'Other'}
                    </h3>
                  </div>
                  <span className="text-caption bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full print:hidden">
                    {items.length}
                  </span>
                </div>
                <div className="p-4 md:p-6 space-y-2 print:p-0 print:space-y-0">
                  {items.map((item) => (
                    <div
                      key={item.catalog_item_id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg wireframe-border print:border-0 print:p-1 print:bg-transparent"
                    >
                      <div className="flex items-center flex-wrap gap-y-1">
                        <span className="text-label-md text-on-surface print:text-black">
                          {item.catalog_item_name}
                        </span>
                        <span className="text-caption text-on-surface-variant ml-2 print:text-black">
                          {item.total_qty} {item.unit}
                        </span>
                        {item.packages_needed != null && (
                          <span className="text-caption text-outline ml-1 print:text-black">
                            &mdash; buy {item.packages_needed} x {item.package_size}
                            {item.package_unit}
                          </span>
                        )}
                        {item.is_on_promotion && (
                          <span className="ml-2 inline-flex items-center gap-1 bg-tertiary-container text-on-tertiary-container text-xs px-2 py-0.5 rounded-full font-semibold print:hidden">
                            <Icon name="local_offer" size={12} />
                            Promo
                          </span>
                        )}
                        {isPriceStale(item.last_enriched_at) && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-error text-xs print:hidden"
                            title="Price may be outdated"
                          >
                            <Icon name="warning" size={14} />
                          </span>
                        )}
                      </div>
                      {item.line_total != null && (
                        <span className="text-label-md font-semibold text-primary print:text-black">
                          &euro;{item.line_total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {data.extras.length > 0 && (
              <div className="bg-surface-container-lowest rounded-lg wireframe-border overflow-hidden print:border-0 print:bg-transparent">
                <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-tertiary/5 border-b border-outline-variant/50 print:bg-transparent print:px-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      name="add_shopping_cart"
                      size={20}
                      className="text-primary print:hidden"
                    />
                    <h3 className="text-label-md text-primary uppercase tracking-wider font-semibold print:text-black">
                      Extras
                    </h3>
                  </div>
                  <span className="text-caption bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full print:hidden">
                    {data.extras.length}
                  </span>
                </div>
                <div className="p-4 md:p-6 space-y-2 print:p-0 print:space-y-0">
                  {data.extras.map((item) => (
                    <div
                      key={item.catalog_item_id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg wireframe-border print:border-0 print:p-1 print:bg-transparent"
                    >
                      <div className="flex items-center flex-wrap gap-y-1">
                        <span className="text-label-md text-on-surface print:text-black">
                          {item.catalog_item_name}
                        </span>
                        {item.total_qty != null && item.unit && (
                          <span className="text-caption text-on-surface-variant ml-2 print:text-black">
                            {item.total_qty} {item.unit}
                          </span>
                        )}
                        {item.packages_needed != null && (
                          <span className="text-caption text-outline ml-1 print:text-black">
                            &mdash; buy {item.packages_needed} x {item.package_size}
                            {item.package_unit}
                          </span>
                        )}
                        {item.is_on_promotion && (
                          <span className="ml-2 inline-flex items-center gap-1 bg-tertiary-container text-on-tertiary-container text-xs px-2 py-0.5 rounded-full font-semibold print:hidden">
                            <Icon name="local_offer" size={12} />
                            Promo
                          </span>
                        )}
                        {isPriceStale(item.last_enriched_at) && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-error text-xs print:hidden"
                            title="Price may be outdated"
                          >
                            <Icon name="warning" size={14} />
                          </span>
                        )}
                      </div>
                      {item.line_total != null && (
                        <span className="text-label-md font-semibold text-primary print:text-black">
                          &euro;{item.line_total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-outline-variant p-4 rounded-lg flex flex-col sm:flex-row gap-4 sm:gap-6 print:border-0 print:bg-transparent print:px-0">
              <div>
                <span className="text-caption text-on-surface-variant uppercase tracking-wider block print:text-black">
                  Total Items
                </span>
                <span className="text-headline-md font-heading font-semibold print:text-black">
                  {data.total_items}
                </span>
              </div>
              <div>
                <span className="text-caption text-on-surface-variant uppercase tracking-wider block print:text-black">
                  Estimated Total
                </span>
                <span className="text-headline-md font-heading font-semibold text-primary print:text-black">
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
