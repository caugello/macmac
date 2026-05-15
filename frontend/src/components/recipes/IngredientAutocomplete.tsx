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
                      <div className="font-medium">{item.canonical_name || item.raw_name}</div>
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
