import { apiClient } from './client'
import type {
  RecipeCreate,
  RecipeUpdate,
  RecipeOut,
  RecipeListResponse,
  RecipeCategoryCountsResponse,
  DeleteResponse,
  FavoriteResponse,
} from '../lib/types'

export const recipesApi = {
  list: (params?: {
    limit?: number
    offset?: number
    search?: string
    ingredient?: string
    sort?: string
    /** Comma-separated category values, e.g. "breakfast,dessert". */
    category?: string
  }) => apiClient.get<RecipeListResponse>('/recipes', { params }).then((res) => res.data),

  categoryCounts: (params?: { search?: string }) =>
    apiClient
      .get<RecipeCategoryCountsResponse>('/recipes/category-counts', { params })
      .then((res) => res.data),

  get: (id: string) => apiClient.get<RecipeOut>(`/recipes/${id}`).then((res) => res.data),

  create: (data: RecipeCreate) =>
    apiClient.post<RecipeOut>('/recipes', data).then((res) => res.data),

  update: (id: string, data: RecipeUpdate) =>
    apiClient.patch<RecipeOut>(`/recipes/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    apiClient.delete<DeleteResponse>(`/recipes/${id}`).then((res) => res.data),

  favorite: (id: string) =>
    apiClient.post<FavoriteResponse>(`/recipes/${id}/favorite`).then((res) => res.data),

  unfavorite: (id: string) =>
    apiClient.delete<FavoriteResponse>(`/recipes/${id}/favorite`).then((res) => res.data),
}
