import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCatalog, useCatalogCategories, useCatalogItem } from './useCatalog'
import { catalogApi } from '../api/catalog'

vi.mock('../api/catalog')

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

describe('useCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch catalog items without params', async () => {
    const mockData = { data: [], total: 0, limit: 10, offset: 0 }
    vi.mocked(catalogApi.list).mockResolvedValue(mockData)

    const { result } = renderHook(() => useCatalog(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.list).toHaveBeenCalledWith(undefined)
    expect(result.current.data).toEqual(mockData)
  })

  it('should fetch catalog items with params', async () => {
    const mockData = { data: [], total: 0, limit: 10, offset: 0 }
    const params = { limit: 20, offset: 10, search: 'milk' }
    vi.mocked(catalogApi.list).mockResolvedValue(mockData)

    const { result } = renderHook(() => useCatalog(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.list).toHaveBeenCalledWith(params)
  })
})

describe('useCatalogCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch catalog categories', async () => {
    const mockData = { categories: ['Beverages', 'Dairy & Eggs'] }
    vi.mocked(catalogApi.categories).mockResolvedValue(mockData)

    const { result } = renderHook(() => useCatalogCategories(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.categories).toHaveBeenCalled()
    expect(result.current.data).toEqual(mockData)
  })
})

describe('useCatalogItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch a single catalog item by id', async () => {
    const mockItem = {
      id: '1',
      vendor_name: 'Vendor',
      raw_name: 'Test Item Raw',
      product_url: 'https://example.com',
      canonical_name: 'Test Item',
      normalized_name: null,
      brand: 'Brand',
      net_quantity_value: null,
      net_quantity_unit: null,
      is_food: true,
      price: null,
      currency: null,
      category: null,
      nutrition: null,
      nutriscore: null,
      nutriscore_svg: null,
      promotion_until_date: null,
      image_url: null,
      created_at: '',
      updated_at: '',
    }
    vi.mocked(catalogApi.get).mockResolvedValue(mockItem)

    const { result } = renderHook(() => useCatalogItem('1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(catalogApi.get).toHaveBeenCalledWith('1')
    expect(result.current.data).toEqual(mockItem)
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useCatalogItem(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(catalogApi.get).not.toHaveBeenCalled()
  })
})
