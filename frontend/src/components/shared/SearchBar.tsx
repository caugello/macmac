import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 500,
}: SearchBarProps) => {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs, onChange])

  return (
    <div className="relative">
      <Icon
        name="search"
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-12 h-14 rounded bg-surface-container-lowest border-outline-variant text-on-surface placeholder:text-on-surface-variant"
      />
    </div>
  )
}
