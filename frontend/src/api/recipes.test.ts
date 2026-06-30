import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recipesApi } from './recipes'
import { apiClient } from './client'
import { RecipeDifficultyEnum } from '../lib/types'

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('recipesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('should call GET /recipes without params', async () => {
      const mockResponse = {
        data: {
          total: 10,
          limit: 20,
          offset: 0,
          data: [],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await recipesApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/recipes', { params: undefined })
      expect(result).toEqual(mockResponse.data)
    })

    it('should call GET /recipes with query params', async () => {
      const mockResponse = { data: { total: 5, limit: 10, offset: 0, data: [] } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = {
        limit: 10,
        offset: 0,
        search: 'pasta',
        ingredient: 'tomato',
        sort: 'title:asc',
      }

      await recipesApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/recipes', { params })
    })

    it('should pass a comma-separated category filter', async () => {
      const mockResponse = { data: { total: 0, limit: 20, offset: 0, data: [] } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = { category: 'breakfast,dessert' }
      await recipesApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/recipes', { params })
    })
  })

  describe('categoryCounts', () => {
    it('should call GET /recipes/category-counts without params', async () => {
      const mockResponse = { data: { counts: { breakfast: 3, dessert: 1 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await recipesApi.categoryCounts()

      expect(apiClient.get).toHaveBeenCalledWith('/recipes/category-counts', {
        params: undefined,
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should pass the search param', async () => {
      const mockResponse = { data: { counts: { breakfast: 1 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      await recipesApi.categoryCounts({ search: 'pancakes' })

      expect(apiClient.get).toHaveBeenCalledWith('/recipes/category-counts', {
        params: { search: 'pancakes' },
      })
    })
  })

  describe('get', () => {
    it('should call GET /recipes/:id', async () => {
      const mockRecipe = {
        data: {
          id: 'recipe-123',
          title: 'Test Recipe',
          description: 'Test',
          ingredients: [],
          steps: [],
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockRecipe)

      const result = await recipesApi.get('recipe-123')

      expect(apiClient.get).toHaveBeenCalledWith('/recipes/recipe-123')
      expect(result).toEqual(mockRecipe.data)
    })
  })

  describe('create', () => {
    it('should call POST /recipes with recipe data', async () => {
      const newRecipe = {
        title: 'New Recipe',
        description: 'Description',
        ingredients: [],
        steps: [],
      }

      const mockResponse = {
        data: {
          id: 'new-recipe-id',
          ...newRecipe,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await recipesApi.create(newRecipe)

      expect(apiClient.post).toHaveBeenCalledWith('/recipes', newRecipe)
      expect(result).toEqual(mockResponse.data)
    })

    it('should pass prep_time, calories, difficulty and image_url through', async () => {
      const newRecipe = {
        title: 'Detailed Recipe',
        prep_time: 25,
        calories: 480,
        difficulty: RecipeDifficultyEnum.MEDIUM,
        image_url: 'https://example.com/cake.jpg',
        ingredients: [],
      }

      const mockResponse = {
        data: {
          id: 'detailed-id',
          ...newRecipe,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await recipesApi.create(newRecipe)

      expect(apiClient.post).toHaveBeenCalledWith('/recipes', newRecipe)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('update', () => {
    it('should call PATCH /recipes/:id with update data', async () => {
      const updateData = {
        title: 'Updated Title',
      }

      const mockResponse = {
        data: {
          id: 'recipe-123',
          title: 'Updated Title',
          description: 'Test',
          ingredients: [],
          steps: [],
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
        },
      }

      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

      const result = await recipesApi.update('recipe-123', updateData)

      expect(apiClient.patch).toHaveBeenCalledWith('/recipes/recipe-123', updateData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('delete', () => {
    it('should call DELETE /recipes/:id', async () => {
      const mockResponse = {
        data: {
          message: 'Recipe deleted successfully',
        },
      }

      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await recipesApi.delete('recipe-123')

      expect(apiClient.delete).toHaveBeenCalledWith('/recipes/recipe-123')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('favorite', () => {
    it('should call POST /recipes/:id/favorite', async () => {
      const mockResponse = { data: { recipe_id: 'recipe-123', is_favorite: true } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await recipesApi.favorite('recipe-123')

      expect(apiClient.post).toHaveBeenCalledWith('/recipes/recipe-123/favorite')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('unfavorite', () => {
    it('should call DELETE /recipes/:id/favorite', async () => {
      const mockResponse = { data: { recipe_id: 'recipe-123', is_favorite: false } }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await recipesApi.unfavorite('recipe-123')

      expect(apiClient.delete).toHaveBeenCalledWith('/recipes/recipe-123/favorite')
      expect(result).toEqual(mockResponse.data)
    })
  })
})
