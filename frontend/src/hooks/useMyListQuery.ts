import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { myListApi } from '../api/myList'
import type { MyListItemCreate } from '../lib/types'

export const MY_LIST_QUERY_KEY = ['my-list'] as const

export const useMyListQuery = (enabled = true) => {
  return useQuery({
    queryKey: MY_LIST_QUERY_KEY,
    queryFn: () => myListApi.list(),
    staleTime: 60 * 1000, // 1 minute
    enabled,
  })
}

export const useAddMyListItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MyListItemCreate) => myListApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_LIST_QUERY_KEY })
    },
  })
}

export const useRemoveMyListItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (catalogItemId: string) => myListApi.remove(catalogItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_LIST_QUERY_KEY })
    },
  })
}

export const useClearMyList = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => myListApi.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_LIST_QUERY_KEY })
    },
  })
}
