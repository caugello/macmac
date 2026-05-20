import { useState } from 'react'
import { format } from 'date-fns'
import { useGenerateShoppingList } from '@/hooks/useMealPlans'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

interface ShoppingListProps {
  weekStart: Date
  weekEnd: Date
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

export const ShoppingList = ({ weekStart, weekEnd }: ShoppingListProps) => {
  const [showList, setShowList] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }
  const generateMutation = useGenerateShoppingList()

  const handleGenerate = () => {
    generateMutation.mutate(
      {
        start_date: format(weekStart, 'yyyy-MM-dd'),
        end_date: format(weekEnd, 'yyyy-MM-dd'),
      },
      {
        onSuccess: () => {
          setShowList(true)
          setCheckedItems(new Set())
        },
      }
    )
  }

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const data = generateMutation.data

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        className="bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <Icon name="shopping_cart" size={18} />
        Generate Shopping List
      </button>

      {generateMutation.isPending && (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Generating...
        </div>
      )}

      {showList && data && (
        <div className="space-y-4">
          {Object.entries(data.items_by_category).map(([category, items]) => (
            <div
              key={category}
              className="bg-surface-container-lowest rounded-lg wireframe-border overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between px-4 md:px-6 py-3 bg-primary/5 border-b border-outline-variant/50 w-full text-left hover:bg-primary/8 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Icon name={getCategoryIcon(category)} size={20} className="text-primary" />
                  <h3 className="text-label-md text-primary uppercase tracking-wider font-semibold">
                    {category || 'Other'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-label-sm bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
                    {items.length}
                  </span>
                  <Icon
                    name="expand_more"
                    size={20}
                    className={`text-on-surface-variant transition-transform duration-200 ${collapsedCategories.has(category) ? '-rotate-90' : ''}`}
                  />
                </div>
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: collapsedCategories.has(category)
                    ? '0px'
                    : `${items.length * 72 + 48}px`,
                  opacity: collapsedCategories.has(category) ? 0 : 1,
                }}
              >
                <div className="p-4 md:p-6 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.catalog_item_id}
                      onClick={() => toggleCheck(item.catalog_item_id)}
                      className={`flex items-center justify-between p-3 bg-surface rounded-lg wireframe-border hover:border-primary/50 transition-colors cursor-pointer ${
                        checkedItems.has(item.catalog_item_id) ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checkedItems.has(item.catalog_item_id)}
                          onChange={() => toggleCheck(item.catalog_item_id)}
                          className="w-6 h-6 rounded border-outline text-primary focus:ring-primary accent-primary"
                        />
                        <div>
                          <span
                            className={`text-label-md text-on-surface ${checkedItems.has(item.catalog_item_id) ? 'line-through' : ''}`}
                          >
                            {item.catalog_item_name}
                          </span>
                          <span className="text-label-sm text-on-surface-variant ml-2">
                            {item.total_qty} {item.unit}
                          </span>
                        </div>
                      </div>
                      {item.price && (
                        <span className="text-label-md font-semibold text-primary">
                          &euro;{item.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="sticky bottom-16 md:bottom-0 bg-primary/5 border border-outline-variant p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex gap-6">
              <div>
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider block">
                  Total Items
                </span>
                <span className="text-headline-md font-heading font-semibold">
                  {data.total_items}
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant uppercase tracking-wider block">
                  Estimated Total
                </span>
                <span className="text-headline-md font-heading font-semibold text-primary">
                  {data.estimated_total ? `€${data.estimated_total.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                className="flex-1 md:flex-initial flex items-center gap-2 border-outline-variant"
              >
                <Icon name="ios_share" size={18} />
                Export
              </Button>
              <Button className="flex-1 md:flex-initial flex items-center gap-2">
                <Icon name="print" size={18} />
                Print List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
