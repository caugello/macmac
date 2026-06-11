import { useState, useEffect } from 'react'
import { useCatalog } from '@/hooks/useCatalog'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CatalogItemOut } from '@/lib/types'

interface IngredientAutocompleteProps {
  onSelect: (item: CatalogItemOut) => void
  placeholder?: string
}

export const IngredientAutocomplete = ({
  onSelect,
  placeholder = 'Search catalog...',
}: IngredientAutocompleteProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Toggle state is intentionally not persisted; it resets on page load.
  const [foodOnly, setFoodOnly] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useCatalog({
    limit: 20,
    offset: 0,
    search: debouncedSearch,
    is_food: foodOnly ? true : undefined,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={foodOnly}
            onChange={(e) => setFoodOnly(e.target.checked)}
          />
          Food items only
        </label>
        <Command>
          <CommandList>
            {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
            {!isLoading && (!data || data.data.length === 0) && (
              <CommandEmpty>No ingredients found.</CommandEmpty>
            )}
            {!isLoading && data && data.data.length > 0 && (
              <CommandGroup>
                {data.data.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onSelect(item)
                      setSearch('')
                      setOpen(false)
                    }}
                  >
                    <div className="flex flex-col flex-1">
                      <div className="font-medium">
                        {item.canonical_name || item.raw_name}
                        {!item.is_food && (
                          <span className="ml-1 font-normal text-on-surface-variant">
                            (Non-food)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.brand && `${item.brand} • `}
                        {item.net_quantity_value && item.net_quantity_unit && (
                          <span>
                            {item.net_quantity_value}
                            {item.net_quantity_unit}
                          </span>
                        )}
                        {item.price && <span className="ml-2">€{item.price.toFixed(2)}</span>}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
