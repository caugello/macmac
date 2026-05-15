import { apiClient } from './client'
import type { CatalogItemOut, CatalogItemListResponse } from '../lib/types'

export const catalogApi = {
  list: (params?: { limit?: number; offset?: number; search?: string; sort?: string }) =>
    apiClient.get<CatalogItemListResponse>('/catalog', { params }).then((res) => res.data),

  get: (id: string) => apiClient.get<CatalogItemOut>(`/catalog/${id}`).then((res) => res.data),
}
