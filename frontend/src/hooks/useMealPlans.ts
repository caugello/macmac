import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlansApi } from '../api/mealPlans'
import type {
  MealPlanCreate,
  MealPlanUpdate,
  CopyDayRequest,
  CopyWeekRequest,
  ShoppingListRequest,
} from '../lib/types'

export const useMealPlans = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['meal-plans', params],
    queryFn: () => mealPlansApi.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useMealPlan = (id: string) => {
  return useQuery({
    queryKey: ['meal-plan', id],
    queryFn: () => mealPlansApi.get(id),
    enabled: !!id,
  })
}

export const useCreateMealPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MealPlanCreate) => mealPlansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
    },
  })
}

export const useUpdateMealPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MealPlanUpdate }) =>
      mealPlansApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
      queryClient.invalidateQueries({ queryKey: ['meal-plan', variables.id] })
    },
  })
}

export const useDeleteMealPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mealPlansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
    },
  })
}

export const useCopyDay = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CopyDayRequest) => mealPlansApi.copyDay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
    },
  })
}

export const useCopyWeek = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CopyWeekRequest) => mealPlansApi.copyWeek(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
    },
  })
}

export const useGenerateShoppingList = () => {
  return useMutation({
    mutationFn: (data: ShoppingListRequest) => mealPlansApi.generateShoppingList(data),
  })
}
