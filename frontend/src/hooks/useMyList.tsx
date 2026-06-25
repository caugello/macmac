/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { myListApi } from '@/api/myList'
import type { MyListItemCreate, MyListItemOut } from '@/lib/types'

/**
 * "My List" — a personal list of catalog products.
 *
 * Server-backed when the user is authenticated (durable, multi-device), with a
 * localStorage fallback for unauthenticated visitors. Only the minimal product
 * fields needed to render the bottom-sheet rows are stored. On login the local
 * list is merged into the server list (see `mergeLocalMyListIntoServer`).
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

function isAuthenticated(): boolean {
  try {
    return !!localStorage.getItem('auth_token')
  } catch {
    return false
  }
}

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

/** Map a server item to the client shape used by the UI. */
function fromServer(item: MyListItemOut): MyListItem {
  return {
    id: item.catalog_item_id,
    name: item.name,
    brand: item.brand,
    price: item.price,
    imageUrl: item.image_url,
    nutriscore: item.nutriscore,
  }
}

/** Map a client item to the server create payload. */
function toCreatePayload(item: MyListItem): MyListItemCreate {
  return {
    catalog_item_id: item.id,
    name: item.name,
    brand: item.brand,
    price: item.price,
    image_url: item.imageUrl,
    nutriscore: item.nutriscore,
  }
}

/**
 * Merge the locally-stored list into the server list, then clear local storage.
 * Called once on login. Safe to call when there is nothing to merge.
 */
export async function mergeLocalMyListIntoServer(): Promise<void> {
  const local = readStoredItems()
  if (local.length === 0) {
    // Nothing to merge; ensure no stale empty payload lingers.
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear local My List:', error)
    }
    return
  }
  try {
    await myListApi.merge(local.map(toCreatePayload))
  } catch (error) {
    // Keep the local copy so a future login can retry the sync.
    console.error('Failed to sync local My List to server:', error)
    return
  }
  // Merge succeeded: the server is now the source of truth.
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear local My List after sync:', error)
  }
}

export const MyListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authed = isAuthenticated()
  const [items, setItems] = useState<MyListItem[]>(() => (authed ? [] : readStoredItems()))

  // Load the server list on mount when authenticated.
  useEffect(() => {
    if (!authed) return
    let cancelled = false
    myListApi
      .list()
      .then((res) => {
        if (!cancelled) setItems(res.data.map(fromServer))
      })
      .catch((error) => {
        console.error('Failed to load My List from server:', error)
      })
    return () => {
      cancelled = true
    }
  }, [authed])

  // Persist to localStorage only in the unauthenticated (fallback) mode.
  useEffect(() => {
    if (authed) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to persist My List to storage:', error)
    }
  }, [items, authed])

  const addItem = useCallback(
    (item: MyListItem) => {
      setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]))
      if (authed) {
        myListApi
          .add(toCreatePayload(item))
          .catch((error) => console.error('Failed to add item to My List:', error))
      }
    },
    [authed]
  )

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      if (authed) {
        myListApi
          .remove(id)
          .catch((error) => console.error('Failed to remove item from My List:', error))
      }
    },
    [authed]
  )

  const toggleItem = useCallback(
    (item: MyListItem) => {
      setItems((prev) => {
        const exists = prev.some((i) => i.id === item.id)
        if (authed) {
          const op = exists ? myListApi.remove(item.id) : myListApi.add(toCreatePayload(item))
          op.catch((error) => console.error('Failed to update My List:', error))
        }
        return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item]
      })
    },
    [authed]
  )

  const clear = useCallback(() => {
    setItems([])
    if (authed) {
      myListApi.clear().catch((error) => console.error('Failed to clear My List:', error))
    }
  }, [authed])

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
