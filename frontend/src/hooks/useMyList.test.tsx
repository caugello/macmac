import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { MyListProvider, useMyList, type MyListItem } from './useMyList'

const STORAGE_KEY = 'macmac:my-list'

const itemA: MyListItem = {
  id: 'a',
  name: 'Coca-Cola 1.5L',
  brand: 'Coca-Cola',
  price: 1.99,
  imageUrl: 'https://example.com/a.png',
  nutriscore: 'e',
}

const itemB: MyListItem = {
  id: 'b',
  name: 'Oranges 1kg',
  brand: null,
  price: 2.5,
  imageUrl: null,
  nutriscore: 'a',
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MyListProvider>{children}</MyListProvider>
)

describe('useMyList', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    expect(result.current.items).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useMyList())).toThrow(/within MyListProvider/)
  })

  it('adds items and exposes count', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await act(() => result.current.addItem(itemA))
    await act(() => result.current.addItem(itemB))
    expect(result.current.count).toBe(2)
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('does not add duplicates', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await act(() => result.current.addItem(itemA))
    await act(() => result.current.addItem(itemA))
    expect(result.current.count).toBe(1)
  })

  it('removes items by id', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await act(() => result.current.addItem(itemA))
    await act(() => result.current.addItem(itemB))
    act(() => result.current.removeItem('a'))
    expect(result.current.items.map((i) => i.id)).toEqual(['b'])
  })

  it('toggles membership', () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    act(() => result.current.toggleItem(itemA))
    expect(result.current.has('a')).toBe(true)
    act(() => result.current.toggleItem(itemA))
    expect(result.current.has('a')).toBe(false)
  })

  it('clears all items', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await act(() => result.current.addItem(itemA))
    await act(() => result.current.addItem(itemB))
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
  })

  it('reports membership via has()', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    expect(result.current.has('a')).toBe(false)
    await act(() => result.current.addItem(itemA))
    expect(result.current.has('a')).toBe(true)
  })

  it('persists items to localStorage', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await act(() => result.current.addItem(itemA))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('a')
  })

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([itemA]))
    const { result } = renderHook(() => useMyList(), { wrapper })
    expect(result.current.count).toBe(1)
    expect(result.current.items[0].id).toBe('a')
  })

  it('ignores malformed stored data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    const { result } = renderHook(() => useMyList(), { wrapper })
    expect(result.current.items).toEqual([])
  })

  it('filters out malformed entries from stored array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([itemA, { foo: 'bar' }, null]))
    const { result } = renderHook(() => useMyList(), { wrapper })
    expect(result.current.count).toBe(1)
    expect(result.current.items[0].id).toBe('a')
  })
})
