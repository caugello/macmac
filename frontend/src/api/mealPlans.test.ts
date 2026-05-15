import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mealPlansApi } from './mealPlans'
import { apiClient } from './client'

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('mealPlansApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('should call GET /meal-plans without params', async () => {
      const mockResponse = {
        data: {
          total: 5,
          limit: 20,
          offset: 0,
          data: [],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/meal-plans', { params: undefined })
      expect(result).toEqual(mockResponse.data)
    })

    it('should call GET /meal-plans with date range params', async () => {
      const mockResponse = {
        data: {
          total: 7,
          limit: 20,
          offset: 0,
          data: [],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = {
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      }

      await mealPlansApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/meal-plans', { params })
    })
  })

  describe('get', () => {
    it('should call GET /meal-plans/:id', async () => {
      const mockMealPlan = {
        data: {
          id: 'meal-plan-123',
          date: '2024-01-01',
          meal_type: 'dinner',
          recipe_id: 'recipe-123',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockMealPlan)

      const result = await mealPlansApi.get('meal-plan-123')

      expect(apiClient.get).toHaveBeenCalledWith('/meal-plans/meal-plan-123')
      expect(result).toEqual(mockMealPlan.data)
    })
  })

  describe('create', () => {
    it('should call POST /meal-plans with meal plan data', async () => {
      const newMealPlan = {
        date: '2024-01-01',
        meal_type: 'lunch',
        recipe_id: 'recipe-456',
      }

      const mockResponse = {
        data: {
          id: 'new-meal-plan-id',
          ...newMealPlan,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.create(newMealPlan)

      expect(apiClient.post).toHaveBeenCalledWith('/meal-plans', newMealPlan)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('update', () => {
    it('should call PATCH /meal-plans/:id with update data', async () => {
      const updateData = {
        recipe_id: 'new-recipe-id',
      }

      const mockResponse = {
        data: {
          id: 'meal-plan-123',
          date: '2024-01-01',
          meal_type: 'dinner',
          recipe_id: 'new-recipe-id',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
        },
      }

      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.update('meal-plan-123', updateData)

      expect(apiClient.patch).toHaveBeenCalledWith('/meal-plans/meal-plan-123', updateData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('delete', () => {
    it('should call DELETE /meal-plans/:id', async () => {
      const mockResponse = {
        data: {
          message: 'Meal plan deleted successfully',
        },
      }

      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.delete('meal-plan-123')

      expect(apiClient.delete).toHaveBeenCalledWith('/meal-plans/meal-plan-123')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('copyDay', () => {
    it('should call POST /meal-plans/copy-day with copy data', async () => {
      const copyData = {
        source_date: '2024-01-01',
        target_date: '2024-01-02',
      }

      const mockResponse = {
        data: {
          message: 'Day copied successfully',
          copied_count: 3,
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.copyDay(copyData)

      expect(apiClient.post).toHaveBeenCalledWith('/meal-plans/copy-day', copyData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('copyWeek', () => {
    it('should call POST /meal-plans/copy-week with copy data', async () => {
      const copyData = {
        source_start_date: '2024-01-01',
        target_start_date: '2024-01-08',
      }

      const mockResponse = {
        data: {
          message: 'Week copied successfully',
          copied_count: 21,
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.copyWeek(copyData)

      expect(apiClient.post).toHaveBeenCalledWith('/meal-plans/copy-week', copyData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('generateShoppingList', () => {
    it('should call POST /meal-plans/shopping-list with date range', async () => {
      const requestData = {
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      }

      const mockResponse = {
        data: {
          items: [
            {
              catalog_item_id: 'item-1',
              catalog_item_name: 'Tomato',
              total_qty: 2.5,
              unit: 'kg',
            },
          ],
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await mealPlansApi.generateShoppingList(requestData)

      expect(apiClient.post).toHaveBeenCalledWith('/meal-plans/shopping-list', requestData)
      expect(result).toEqual(mockResponse.data)
    })
  })
})
