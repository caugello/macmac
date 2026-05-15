import { useState } from 'react'
import { format } from 'date-fns'
import { useGenerateShoppingList } from '@/hooks/useMealPlans'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'

interface ShoppingListProps {
  weekStart: Date
  weekEnd: Date
}

export const ShoppingList = ({ weekStart, weekEnd }: ShoppingListProps) => {
  const [showList, setShowList] = useState(false)
  const generateMutation = useGenerateShoppingList()

  const handleGenerate = () => {
    generateMutation.mutate(
      {
        start_date: format(weekStart, 'yyyy-MM-dd'),
        end_date: format(weekEnd, 'yyyy-MM-dd'),
      },
      {
        onSuccess: () => setShowList(true),
      }
    )
  }

  const data = generateMutation.data

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGenerate}
        className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black font-semibold"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Generate Shopping List
      </Button>

      {generateMutation.isPending && <div className="text-gray-400">Generating...</div>}

      {showList && data && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Shopping List ({data.total_items} items)
          </h3>
          {data.estimated_total && (
            <p className="text-gray-400">Estimated Total: €{data.estimated_total.toFixed(2)}</p>
          )}

          {Object.entries(data.items_by_category).map(([category, items]) => (
            <Card key={category} className="bg-[#141824] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.catalog_item_id} className="text-gray-300">
                      {item.catalog_item_name}: {item.total_qty} {item.unit}
                      {item.price && ` - €${item.price.toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
