import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { recipesApi } from '../api/recipes'
import type { RecipeCreate, RecipeUpdate, RecipeOut, RecipeListResponse } from '../lib/types'

export const useRecipes = (params?: {
  limit?: number
  offset?: number
  search?: string
  ingredient?: string
  sort?: string
  /** Comma-separated category values, e.g. "breakfast,dessert". */
  category?: string
}) => {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => recipesApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}

export const useRecipeCategoryCounts = (params?: { search?: string }) => {
  return useQuery({
    queryKey: ['recipe-category-counts', params],
    queryFn: () => recipesApi.categoryCounts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useRecipe = (id: string) => {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id),
    enabled: !!id,
  })
}

export const useCreateRecipe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RecipeCreate) => recipesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe-category-counts'] })
    },
  })
}

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecipeUpdate }) => recipesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['recipe-category-counts'] })
    },
  })
}

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recipesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.removeQueries({ queryKey: ['recipe', id] })
      queryClient.invalidateQueries({ queryKey: ['recipe-category-counts'] })
    },
  })
}

/**
 * Toggle a recipe's per-user favorite state with an optimistic update.
 *
 * Optimistically flips is_favorite in both the recipe detail cache and every
 * cached recipe-list page, snapshotting the previous caches so the change can be
 * rolled back if the request fails. Caches are invalidated once the mutation
 * settles to reconcile with the server.
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      isFavorite ? recipesApi.unfavorite(id) : recipesApi.favorite(id),
    onMutate: async ({ id, isFavorite }) => {
      const next = !isFavorite

      await queryClient.cancelQueries({ queryKey: ['recipe', id] })
      await queryClient.cancelQueries({ queryKey: ['recipes'] })

      const previousRecipe = queryClient.getQueryData<RecipeOut>(['recipe', id])
      const previousLists = queryClient.getQueriesData<RecipeListResponse>({
        queryKey: ['recipes'],
      })

      if (previousRecipe) {
        queryClient.setQueryData<RecipeOut>(['recipe', id], {
          ...previousRecipe,
          is_favorite: next,
        })
      }

      queryClient.setQueriesData<RecipeListResponse>({ queryKey: ['recipes'] }, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((r) => (r.id === id ? { ...r, is_favorite: next } : r)),
            }
          : old
      )

      return { previousRecipe, previousLists }
    },
    onError: (_err, { id }, context) => {
      if (context?.previousRecipe) {
        queryClient.setQueryData(['recipe', id], context.previousRecipe)
      }
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
