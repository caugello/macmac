import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyListProvider, useMyList, mergeLocalMyListIntoServer, type MyListItem } from './useMyList'
import { myListApi } from '@/api/myList'
import type { MyListItemOut } from '@/lib/types'

vi.mock('@/api/myList')

const STORAGE_KEY = 'macmac:my-list'

const itemA: MyListItem = {
  id: 'a',
  name: 'Coca-Cola 1.5L',
  brand: 'Coca-Cola',
  price: 1.99,
  imageUrl: null,
  nutriscore: 'e',
}

const serverItem: MyListItemOut = {
  id: 'row-1',
  catalog_item_id: 'server-1',
  name: 'Server Product',
  brand: null,
  price: 3.5,
  image_url: null,
  nutriscore: 'b',
  created_at: '',
  updated_at: '',
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MyListProvider>{children}</MyListProvider>
)

describe('useMyList (server-backed, authenticated)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    localStorage.setItem('auth_token', 'test-token')
    vi.mocked(myListApi.list).mockResolvedValue({ total: 1, data: [serverItem] })
    vi.mocked(myListApi.add).mockResolvedValue({ ...serverItem })
    vi.mocked(myListApi.remove).mockResolvedValue({ success: true })
    vi.mocked(myListApi.clear).mockResolvedValue({ success: true })
  })

  it('loads the list from the server on mount', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))
    expect(myListApi.list).toHaveBeenCalled()
    expect(result.current.items[0].id).toBe('server-1')
  })

  it('does not write to localStorage when authenticated', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))
    act(() => result.current.addItem(itemA))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('addItem pushes to the server and updates state optimistically', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))
    act(() => result.current.addItem(itemA))
    expect(result.current.has('a')).toBe(true)
    expect(myListApi.add).toHaveBeenCalledWith(
      expect.objectContaining({ catalog_item_id: 'a', name: 'Coca-Cola 1.5L' })
    )
  })

  it('removeItem calls the server', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))
    act(() => result.current.removeItem('server-1'))
    expect(result.current.has('server-1')).toBe(false)
    expect(myListApi.remove).toHaveBeenCalledWith('server-1')
  })

  it('clear calls the server', async () => {
    const { result } = renderHook(() => useMyList(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(1))
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
    expect(myListApi.clear).toHaveBeenCalled()
  })

  it('toggleItem adds then removes via the server', async () => {
    vi.mocked(myListApi.list).mockResolvedValue({ total: 0, data: [] })
    const { result } = renderHook(() => useMyList(), { wrapper })
    await waitFor(() => expect(result.current.count).toBe(0))

    act(() => result.current.toggleItem(itemA))
    expect(result.current.has('a')).toBe(true)
    expect(myListApi.add).toHaveBeenCalledTimes(1)

    act(() => result.current.toggleItem(itemA))
    expect(result.current.has('a')).toBe(false)
    expect(myListApi.remove).toHaveBeenCalledWith('a')
  })
})

describe('mergeLocalMyListIntoServer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(myListApi.merge).mockResolvedValue({ total: 0, data: [] })
  })

  it('merges stored items into the server then clears local storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([itemA]))

    await mergeLocalMyListIntoServer()

    expect(myListApi.merge).toHaveBeenCalledWith([
      expect.objectContaining({ catalog_item_id: 'a', name: 'Coca-Cola 1.5L' }),
    ])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('skips the merge call when there is nothing stored', async () => {
    await mergeLocalMyListIntoServer()
    expect(myListApi.merge).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('keeps local storage when the merge request fails (retry on next login)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([itemA]))
    vi.mocked(myListApi.merge).mockRejectedValue(new Error('network'))

    await expect(mergeLocalMyListIntoServer()).resolves.toBeUndefined()

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(1)
  })
})
