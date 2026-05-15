import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/catalog'

export const useCatalog = (params?: {
  limit?: number
  offset?: number
  search?: string
  sort?: string
}) => {
  return useQuery({
    queryKey: ['catalog', params],
    queryFn: () => catalogApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCatalogItem = (id: string) => {
  return useQuery({
    queryKey: ['catalog-item', id],
    queryFn: () => catalogApi.get(id),
    enabled: !!id,
  })
}
