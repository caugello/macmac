import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useCatalog } from '@/hooks/useCatalog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Icon } from '@/components/ui/icon'
import { UnitEnum, type IngredientCreate, type CatalogItemOut } from '@/lib/types'

interface IngredientEditorProps {
  ingredients: (IngredientCreate & { _catalog_item?: CatalogItemOut })[]
  onChange: (ingredients: (IngredientCreate & { _catalog_item?: CatalogItemOut })[]) => void
}

export const IngredientEditor = ({ ingredients, onChange }: IngredientEditorProps) => {
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const updateDropdownPos = useCallback(() => {
    const el = inputContainerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    if (!showResults) return
    updateDropdownPos()
    window.addEventListener('scroll', updateDropdownPos, true)
    window.addEventListener('resize', updateDropdownPos)
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true)
      window.removeEventListener('resize', updateDropdownPos)
    }
  }, [showResults, updateDropdownPos])

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

  const updateIngredient = (index: number, field: 'qty' | 'unit', value: number | UnitEnum) => {
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
      <div ref={inputContainerRef}>
        <div className="relative">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-3.5 text-on-surface-variant"
          />
          <Input
            placeholder="Search catalog to add ingredient..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => {
              setTimeout(() => setShowResults(false), 200)
            }}
            className="pl-10"
          />
        </div>

        {showResults &&
          search &&
          catalogData &&
          catalogData.data.length > 0 &&
          createPortal(
            <div
              className="fixed z-[9999] max-h-[40vh] overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg"
              style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            >
              {catalogData.data.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-surface-variant transition-colors border-b border-outline-variant/30 last:border-b-0"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addIngredient(item)
                  }}
                >
                  <div className="font-medium text-label-md text-on-surface">
                    {item.canonical_name || item.raw_name}
                  </div>
                  <div className="text-label-sm text-on-surface-variant">
                    {item.brand && `${item.brand} • `}
                    {item.net_quantity_value && item.net_quantity_unit && (
                      <span>
                        {item.net_quantity_value}
                        {item.net_quantity_unit}
                      </span>
                    )}
                    {item.price && <span className="ml-2">&euro;{item.price.toFixed(2)}</span>}
                  </div>
                </button>
              ))}
            </div>,
            document.body
          )}
      </div>

      {/* Selected ingredients list */}
      <div className="space-y-2">
        {ingredients.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-4">
            No ingredients added yet. Search above to add from catalog.
          </p>
        )}

        {ingredients.map((ing, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <Icon
              name="drag_indicator"
              size={20}
              className="text-outline shrink-0 cursor-grab hidden md:block"
            />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 flex-grow">
              <div className="flex gap-2 md:contents">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={ing.qty || ''}
                  onChange={(e) => updateIngredient(i, 'qty', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                  className="flex-1 md:col-span-3 h-12 text-center rounded-lg border border-outline-variant bg-surface"
                />
                <Select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value as UnitEnum)}
                  className="flex-1 md:col-span-3 h-12 rounded-lg border border-outline-variant bg-surface"
                >
                  {Object.values(UnitEnum).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-5 h-12 rounded-lg border border-outline-variant bg-surface flex items-center px-3">
                <div className="flex-1 min-w-0">
                  <div className="text-label-md text-on-surface leading-tight truncate">
                    {ing._catalog_item?.canonical_name ||
                      ing._catalog_item?.raw_name ||
                      'Unknown Item'}
                  </div>
                  {ing._catalog_item?.brand && (
                    <div className="text-label-sm text-on-surface-variant leading-tight truncate">
                      {ing._catalog_item.brand}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="p-2 text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add ingredient button */}
      <button
        type="button"
        onClick={() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder="Search catalog to add ingredient..."]'
          )
          searchInput?.focus()
        }}
        className="w-full h-12 mt-3 flex items-center justify-center gap-2 rounded-lg dashed-outline text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
      >
        <Icon name="add_circle" size={20} />
        <span className="text-label-md">Add Ingredient</span>
      </button>
    </div>
  )
}
