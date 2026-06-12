import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { recipesApi } from '../api/recipes'
import type { RecipeCreate, RecipeUpdate } from '../lib/types'

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
