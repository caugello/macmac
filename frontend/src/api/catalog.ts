import { apiClient } from './client'
import type {
  CatalogItemOut,
  CatalogItemListResponse,
  CatalogCategoriesResponse,
} from '../lib/types'

export const catalogApi = {
  list: (params?: {
    limit?: number
    offset?: number
    search?: string
    sort?: string
    category?: string
  }) => apiClient.get<CatalogItemListResponse>('/catalog', { params }).then((res) => res.data),

  get: (id: string) => apiClient.get<CatalogItemOut>(`/catalog/${id}`).then((res) => res.data),

  categories: () =>
    apiClient.get<CatalogCategoriesResponse>('/catalog/categories').then((res) => res.data),
}
