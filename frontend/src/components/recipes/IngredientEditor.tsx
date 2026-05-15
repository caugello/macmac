import { useState } from 'react'
import { useCatalog } from '@/hooks/useCatalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { UnitEnum, type IngredientCreate, type IngredientOut, type CatalogItemOut } from '@/lib/types'
import { Plus, X, Search } from 'lucide-react'

interface IngredientEditorProps {
  ingredients: (IngredientCreate & { _catalog_item?: CatalogItemOut })[]
  onChange: (ingredients: (IngredientCreate & { _catalog_item?: CatalogItemOut })[]) => void
}

export const IngredientEditor = ({ ingredients, onChange }: IngredientEditorProps) => {
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)

  const { data: catalogData } = useCatalog({
    limit: 10,
    offset: 0,
    search: search || undefined,
  })

  const addIngredient = (catalogItem: CatalogItemOut) => {
    const newIngredient: IngredientCreate & { _catalog_item?: CatalogItemOut } = {
      catalog_item_id: catalogItem.id,
      qty: catalogItem.net_quantity_value || 100,
      unit: catalogItem.net_quantity_unit || UnitEnum.GRAM,
      _catalog_item: catalogItem, // Store for display
    }
    onChange([...ingredients, newIngredient])
    setSearch('')
    setShowResults(false)
  }

  const updateIngredient = (
    index: number,
    field: 'qty' | 'unit',
    value: number | UnitEnum
  ) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Search and add new ingredient */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search catalog to add ingredient..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => setShowResults(false), 200)
            }}
            className="pl-10 bg-[#0a0e1a] border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Search results dropdown */}
        {showResults && search && catalogData && catalogData.data.length > 0 && (
          <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-[#0a0e1a] border-gray-700">
            {catalogData.data.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-[#141824] transition-colors border-b border-gray-800 last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault()
                  addIngredient(item)
                }}
              >
                <div className="font-medium text-sm text-white">
                  {item.canonical_name || item.raw_name}
                </div>
                <div className="text-xs text-gray-400">
                  {item.brand && `${item.brand} • `}
                  {item.net_quantity_value && item.net_quantity_unit && (
                    <span>
                      {item.net_quantity_value}
                      {item.net_quantity_unit}
                    </span>
                  )}
                  {item.price && (
                    <span className="ml-2">€{item.price.toFixed(2)}</span>
                  )}
                </div>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Selected ingredients list */}
      <div className="space-y-2">
        {ingredients.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No ingredients added yet. Search above to add from catalog.
          </p>
        )}

        {ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2 items-center p-3 border border-gray-700 rounded-lg bg-[#0a0e1a]">
            <div className="flex-1">
              <div className="font-medium text-sm text-white">
                {ing._catalog_item?.canonical_name || ing._catalog_item?.raw_name || 'Unknown Item'}
              </div>
              {ing._catalog_item?.brand && (
                <div className="text-xs text-gray-400">{ing._catalog_item.brand}</div>
              )}
            </div>
            <div className="w-24">
              <Input
                type="number"
                placeholder="Qty"
                value={ing.qty || ''}
                onChange={(e) => updateIngredient(i, 'qty', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="text-sm bg-[#141824] border-gray-700 text-white"
              />
            </div>
            <div className="w-24">
              <Select
                value={ing.unit}
                onChange={(e) => updateIngredient(i, 'unit', e.target.value as UnitEnum)}
                className="text-sm bg-[#141824] border-gray-700 text-white"
              >
                {Object.values(UnitEnum).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeIngredient(i)}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
