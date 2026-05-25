import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useMealPlans,
  useMealPlan,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useCopyDay,
  useCopyWeek,
  useGenerateShoppingList,
} from './useMealPlans'
import { mealPlansApi } from '../api/mealPlans'
import { MealTypeEnum } from '@/lib/types'

vi.mock('../api/mealPlans')

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

const mockMealPlanOut = {
  id: '1',
  date: '2024-01-01',
  meal_type: MealTypeEnum.DINNER,
  recipe_id: 'r1',
  recipe_title: null,
  notes: null,
  created_at: '',
  updated_at: '',
}

describe('useMealPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch meal plans without params', async () => {
    const mockData = { data: [], total: 0 }
    vi.mocked(mealPlansApi.list).mockResolvedValue(mockData)

    const { result } = renderHook(() => useMealPlans(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.list).toHaveBeenCalledWith(undefined)
    expect(result.current.data).toEqual(mockData)
  })

  it('should fetch meal plans with date range params', async () => {
    const mockData = { data: [], total: 0 }
    const params = { start_date: '2024-01-01', end_date: '2024-01-07' }
    vi.mocked(mealPlansApi.list).mockResolvedValue(mockData)

    const { result } = renderHook(() => useMealPlans(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.list).toHaveBeenCalledWith(params)
  })
})

describe('useMealPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch a single meal plan by id', async () => {
    vi.mocked(mealPlansApi.get).mockResolvedValue(mockMealPlanOut)

    const { result } = renderHook(() => useMealPlan('1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.get).toHaveBeenCalledWith('1')
    expect(result.current.data).toEqual(mockMealPlanOut)
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useMealPlan(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mealPlansApi.get).not.toHaveBeenCalled()
  })
})

describe('useCreateMealPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a meal plan and invalidate queries', async () => {
    const createData = { date: '2024-01-01', meal_type: MealTypeEnum.DINNER, recipe_id: 'r1' }
    vi.mocked(mealPlansApi.create).mockResolvedValue(mockMealPlanOut)

    const { result } = renderHook(() => useCreateMealPlan(), { wrapper: createWrapper() })

    result.current.mutate(createData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.create).toHaveBeenCalledWith(createData)
    expect(result.current.data).toEqual(mockMealPlanOut)
  })
})

describe('useUpdateMealPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a meal plan and invalidate queries', async () => {
    const updated = { ...mockMealPlanOut, meal_type: MealTypeEnum.LUNCH, recipe_id: 'r2' }
    const updateData = { meal_type: MealTypeEnum.LUNCH, recipe_id: 'r2' }
    vi.mocked(mealPlansApi.update).mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdateMealPlan(), { wrapper: createWrapper() })

    result.current.mutate({ id: '1', data: updateData })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.update).toHaveBeenCalledWith('1', updateData)
    expect(result.current.data).toEqual(updated)
  })
})

describe('useDeleteMealPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a meal plan and invalidate queries', async () => {
    vi.mocked(mealPlansApi.delete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteMealPlan(), { wrapper: createWrapper() })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.delete).toHaveBeenCalledWith('1')
  })
})

describe('useCopyDay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should copy a day and invalidate queries', async () => {
    const copyData = { source_date: '2024-01-01', target_date: '2024-01-02' }
    vi.mocked(mealPlansApi.copyDay).mockResolvedValue({ copied_count: 3, message: 'ok' })

    const { result } = renderHook(() => useCopyDay(), { wrapper: createWrapper() })

    result.current.mutate(copyData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.copyDay).toHaveBeenCalledWith(copyData)
  })
})

describe('useCopyWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should copy a week and invalidate queries', async () => {
    const copyData = { source_week_start: '2024-01-01', target_week_start: '2024-01-08' }
    vi.mocked(mealPlansApi.copyWeek).mockResolvedValue({ copied_count: 21, message: 'ok' })

    const { result } = renderHook(() => useCopyWeek(), { wrapper: createWrapper() })

    result.current.mutate(copyData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.copyWeek).toHaveBeenCalledWith(copyData)
  })
})

describe('useGenerateShoppingList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate shopping list', async () => {
    const mockShoppingList = {
      date_range: { start_date: '2024-01-01', end_date: '2024-01-07' },
      items_by_category: {},
      total_items: 0,
      estimated_total: null,
    }
    const requestData = { start_date: '2024-01-01', end_date: '2024-01-07' }
    vi.mocked(mealPlansApi.generateShoppingList).mockResolvedValue(mockShoppingList)

    const { result } = renderHook(() => useGenerateShoppingList(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(requestData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mealPlansApi.generateShoppingList).toHaveBeenCalledWith(requestData)
    expect(result.current.data).toEqual(mockShoppingList)
  })
})
