import { apiClient } from './client'
import type {
  MealPlanCreate,
  MealPlanUpdate,
  MealPlanOut,
  MealPlanListResponse,
  CopyDayRequest,
  CopyWeekRequest,
  CopyResponse,
  ShoppingListRequest,
  ShoppingListResponse,
  DeleteResponse,
} from '../lib/types'

export const mealPlansApi = {
  list: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get<MealPlanListResponse>('/meal-plans', { params }).then((res) => res.data),

  get: (id: string) => apiClient.get<MealPlanOut>(`/meal-plans/${id}`).then((res) => res.data),

  create: (data: MealPlanCreate) =>
    apiClient.post<MealPlanOut>('/meal-plans', data).then((res) => res.data),

  update: (id: string, data: MealPlanUpdate) =>
    apiClient.patch<MealPlanOut>(`/meal-plans/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    apiClient.delete<DeleteResponse>(`/meal-plans/${id}`).then((res) => res.data),

  copyDay: (data: CopyDayRequest) =>
    apiClient.post<CopyResponse>('/meal-plans/copy-day', data).then((res) => res.data),

  copyWeek: (data: CopyWeekRequest) =>
    apiClient.post<CopyResponse>('/meal-plans/copy-week', data).then((res) => res.data),

  generateShoppingList: (data: ShoppingListRequest) =>
    apiClient
      .post<ShoppingListResponse>('/meal-plans/shopping-list', data)
      .then((res) => res.data),
}
