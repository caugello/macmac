import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useMyListQuery,
  useAddMyListItem,
  useRemoveMyListItem,
  useClearMyList,
} from './useMyListQuery'
import { myListApi } from '../api/myList'
import type { MyListItemOut } from '@/lib/types'

vi.mock('../api/myList')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const itemOut: MyListItemOut = {
  id: 'row-1',
  catalog_item_id: 'cat-1',
  name: 'Coca-Cola',
  brand: 'Coca-Cola',
  price: 1.99,
  image_url: null,
  nutriscore: 'e',
  created_at: '',
  updated_at: '',
}

describe('useMyListQuery hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the list', async () => {
    vi.mocked(myListApi.list).mockResolvedValue({ total: 1, data: [itemOut] })
    const { result } = renderHook(() => useMyListQuery(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(myListApi.list).toHaveBeenCalled()
    expect(result.current.data?.total).toBe(1)
  })

  it('does not fetch when disabled', async () => {
    vi.mocked(myListApi.list).mockResolvedValue({ total: 0, data: [] })
    renderHook(() => useMyListQuery(false), { wrapper: createWrapper() })
    expect(myListApi.list).not.toHaveBeenCalled()
  })

  it('add mutation calls the api', async () => {
    vi.mocked(myListApi.add).mockResolvedValue(itemOut)
    const { result } = renderHook(() => useAddMyListItem(), { wrapper: createWrapper() })
    result.current.mutate({ catalog_item_id: 'cat-1', name: 'Coca-Cola' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(myListApi.add).toHaveBeenCalledWith({ catalog_item_id: 'cat-1', name: 'Coca-Cola' })
  })

  it('remove mutation calls the api', async () => {
    vi.mocked(myListApi.remove).mockResolvedValue({ success: true })
    const { result } = renderHook(() => useRemoveMyListItem(), { wrapper: createWrapper() })
    result.current.mutate('cat-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(myListApi.remove).toHaveBeenCalledWith('cat-1')
  })

  it('clear mutation calls the api', async () => {
    vi.mocked(myListApi.clear).mockResolvedValue({ success: true })
    const { result } = renderHook(() => useClearMyList(), { wrapper: createWrapper() })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(myListApi.clear).toHaveBeenCalled()
  })
})
