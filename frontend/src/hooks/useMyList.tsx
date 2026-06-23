/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * "My List" — a personal, client-side list of catalog products.
 *
 * Persisted to localStorage (no backend this round; a future follow-up will
 * sync this to a server-side list). Only the minimal product fields needed to
 * render the bottom-sheet rows are stored.
 */
export interface MyListItem {
  id: string
  name: string
  brand: string | null
  price: number | null
  imageUrl: string | null
  nutriscore: string | null
}

interface MyListContextType {
  items: MyListItem[]
  count: number
  addItem: (item: MyListItem) => void
  removeItem: (id: string) => void
  toggleItem: (item: MyListItem) => void
  clear: () => void
  has: (id: string) => boolean
}

const STORAGE_KEY = 'macmac:my-list'

const MyListContext = createContext<MyListContextType | undefined>(undefined)

function readStoredItems(): MyListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Keep only well-formed entries (defensive against schema drift).
    return parsed.filter(
      (entry): entry is MyListItem =>
        entry != null && typeof entry === 'object' && typeof entry.id === 'string'
    )
  } catch (error) {
    console.error('Failed to read My List from storage:', error)
    return []
  }
}

export const MyListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<MyListItem[]>(() => readStoredItems())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to persist My List to storage:', error)
    }
  }, [items])

  const addItem = useCallback((item: MyListItem) => {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const toggleItem = useCallback((item: MyListItem) => {
    setItems((prev) =>
      prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]
    )
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items])

  const value = useMemo<MyListContextType>(
    () => ({
      items,
      count: items.length,
      addItem,
      removeItem,
      toggleItem,
      clear,
      has,
    }),
    [items, addItem, removeItem, toggleItem, clear, has]
  )

  return <MyListContext.Provider value={value}>{children}</MyListContext.Provider>
}

export const useMyList = () => {
  const context = useContext(MyListContext)
  if (!context) {
    throw new Error('useMyList must be used within MyListProvider')
  }
  return context
}
