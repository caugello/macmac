import { describe, it, expect, beforeEach, vi } from 'vitest'
import { catalogApi } from './catalog'
import { apiClient } from './client'

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('catalogApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('should call GET /catalog without params', async () => {
      const mockResponse = {
        data: {
          total: 100,
          limit: 20,
          offset: 0,
          data: [],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await catalogApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/catalog', { params: undefined })
      expect(result).toEqual(mockResponse.data)
    })

    it('should call GET /catalog with query params', async () => {
      const mockResponse = {
        data: {
          total: 50,
          limit: 10,
          offset: 0,
          data: [],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = {
        limit: 10,
        offset: 0,
        search: 'tomato',
        sort: 'canonical_name:asc',
      }

      await catalogApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/catalog', { params })
    })
  })

  describe('categories', () => {
    it('should call GET /catalog/categories', async () => {
      const mockResponse = {
        data: { categories: ['Beverages', 'Dairy & Eggs', 'Meat & Poultry'] },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await catalogApi.categories()

      expect(apiClient.get).toHaveBeenCalledWith('/catalog/categories')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('get', () => {
    it('should call GET /catalog/:id', async () => {
      const mockItem = {
        data: {
          id: 'catalog-item-123',
          raw_name: 'Fresh Tomatoes',
          canonical_name: 'Tomato',
          brand: 'Generic',
          unit_of_measure: 'kg',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockItem)

      const result = await catalogApi.get('catalog-item-123')

      expect(apiClient.get).toHaveBeenCalledWith('/catalog/catalog-item-123')
      expect(result).toEqual(mockItem.data)
    })
  })
})
