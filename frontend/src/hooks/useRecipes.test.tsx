import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useRecipes,
  useRecipeCategoryCounts,
  useRecipe,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useToggleFavorite,
} from './useRecipes'
import { recipesApi } from '../api/recipes'
import type { RecipeOut, RecipeListResponse } from '../lib/types'

vi.mock('../api/recipes')

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

describe('useRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch recipes without params', async () => {
    const mockData = { data: [], total: 0, limit: 10, offset: 0 }
    vi.mocked(recipesApi.list).mockResolvedValue(mockData)

    const { result } = renderHook(() => useRecipes(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.list).toHaveBeenCalledWith(undefined)
    expect(result.current.data).toEqual(mockData)
  })

  it('should fetch recipes with params', async () => {
    const mockData = { data: [], total: 0, limit: 10, offset: 0 }
    const params = { limit: 20, offset: 10, search: 'pasta' }
    vi.mocked(recipesApi.list).mockResolvedValue(mockData)

    const { result } = renderHook(() => useRecipes(params), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.list).toHaveBeenCalledWith(params)
  })
})

describe('useRecipeCategoryCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch category counts without params', async () => {
    const mockData = { counts: { breakfast: 2, dessert: 5 } }
    vi.mocked(recipesApi.categoryCounts).mockResolvedValue(mockData)

    const { result } = renderHook(() => useRecipeCategoryCounts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.categoryCounts).toHaveBeenCalledWith(undefined)
    expect(result.current.data).toEqual(mockData)
  })

  it('should fetch category counts scoped to a search term', async () => {
    const mockData = { counts: { breakfast: 1 } }
    const params = { search: 'pancakes' }
    vi.mocked(recipesApi.categoryCounts).mockResolvedValue(mockData)

    const { result } = renderHook(() => useRecipeCategoryCounts(params), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.categoryCounts).toHaveBeenCalledWith(params)
  })
})

describe('useRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch a single recipe by id', async () => {
    const mockRecipe = {
      id: '1',
      title: 'Test Recipe',
      normalized_title: 'test recipe',
      description: null,
      ingredients: [],
      servings: null,
      prep_time: null,
      calories: null,
      difficulty: null,
      image_url: null,
      category: null,
      steps: null,
      is_favorite: false,
      created_at: '',
      updated_at: '',
    }
    vi.mocked(recipesApi.get).mockResolvedValue(mockRecipe)

    const { result } = renderHook(() => useRecipe('1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.get).toHaveBeenCalledWith('1')
    expect(result.current.data).toEqual(mockRecipe)
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useRecipe(''), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(recipesApi.get).not.toHaveBeenCalled()
  })
})

describe('useCreateRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a recipe and invalidate queries', async () => {
    const mockRecipe = {
      id: '1',
      title: 'New Recipe',
      normalized_title: 'new recipe',
      description: null,
      ingredients: [],
      servings: null,
      prep_time: null,
      calories: null,
      difficulty: null,
      image_url: null,
      category: null,
      steps: null,
      is_favorite: false,
      created_at: '',
      updated_at: '',
    }
    const createData = { title: 'New Recipe', ingredients: [] }
    vi.mocked(recipesApi.create).mockResolvedValue(mockRecipe)

    const { result } = renderHook(() => useCreateRecipe(), { wrapper: createWrapper() })

    result.current.mutate(createData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.create).toHaveBeenCalledWith(createData)
    expect(result.current.data).toEqual(mockRecipe)
  })
})

describe('useUpdateRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a recipe and invalidate queries', async () => {
    const mockRecipe = {
      id: '1',
      title: 'Updated Recipe',
      normalized_title: 'updated recipe',
      description: null,
      ingredients: [],
      servings: null,
      prep_time: null,
      calories: null,
      difficulty: null,
      image_url: null,
      category: null,
      steps: null,
      is_favorite: false,
      created_at: '',
      updated_at: '',
    }
    const updateData = { title: 'Updated Recipe' }
    vi.mocked(recipesApi.update).mockResolvedValue(mockRecipe)

    const { result } = renderHook(() => useUpdateRecipe(), { wrapper: createWrapper() })

    result.current.mutate({ id: '1', data: updateData })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.update).toHaveBeenCalledWith('1', updateData)
    expect(result.current.data).toEqual(mockRecipe)
  })
})

describe('useDeleteRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a recipe and invalidate queries', async () => {
    vi.mocked(recipesApi.delete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteRecipe(), { wrapper: createWrapper() })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.delete).toHaveBeenCalledWith('1')
  })
})

describe('useToggleFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const makeRecipe = (overrides: Partial<RecipeOut> = {}): RecipeOut => ({
    id: '1',
    title: 'Cake',
    normalized_title: 'cake',
    description: null,
    servings: null,
    prep_time: null,
    calories: null,
    difficulty: null,
    image_url: null,
    category: null,
    ingredients: [],
    steps: null,
    is_favorite: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  })

  const seededWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    queryClient.setQueryData<RecipeOut>(['recipe', '1'], makeRecipe())
    queryClient.setQueryData<RecipeListResponse>(['recipes', undefined], {
      total: 1,
      limit: 20,
      offset: 0,
      data: [makeRecipe()],
    })
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    return { queryClient, Wrapper }
  }

  it('calls favorite when the recipe is not yet a favorite', async () => {
    vi.mocked(recipesApi.favorite).mockResolvedValue({ recipe_id: '1', is_favorite: true })
    const { Wrapper } = seededWrapper()

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper })
    result.current.mutate({ id: '1', isFavorite: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.favorite).toHaveBeenCalledWith('1')
    expect(recipesApi.unfavorite).not.toHaveBeenCalled()
  })

  it('calls unfavorite when the recipe is already a favorite', async () => {
    vi.mocked(recipesApi.unfavorite).mockResolvedValue({ recipe_id: '1', is_favorite: false })
    const { Wrapper } = seededWrapper()

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper })
    result.current.mutate({ id: '1', isFavorite: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recipesApi.unfavorite).toHaveBeenCalledWith('1')
    expect(recipesApi.favorite).not.toHaveBeenCalled()
  })

  it('optimistically flips is_favorite in the detail and list caches', async () => {
    let resolveFavorite: (v: { recipe_id: string; is_favorite: boolean }) => void = () => {}
    vi.mocked(recipesApi.favorite).mockReturnValue(
      new Promise((resolve) => {
        resolveFavorite = resolve
      })
    )
    const { queryClient, Wrapper } = seededWrapper()

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper })
    result.current.mutate({ id: '1', isFavorite: false })

    // Optimistic update applied before the request resolves.
    await waitFor(() => {
      expect(queryClient.getQueryData<RecipeOut>(['recipe', '1'])?.is_favorite).toBe(true)
    })
    const list = queryClient.getQueryData<RecipeListResponse>(['recipes', undefined])
    expect(list?.data[0].is_favorite).toBe(true)

    resolveFavorite({ recipe_id: '1', is_favorite: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('rolls back the optimistic update on error', async () => {
    vi.mocked(recipesApi.favorite).mockRejectedValue(new Error('boom'))
    const { queryClient, Wrapper } = seededWrapper()

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper })
    result.current.mutate({ id: '1', isFavorite: false })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<RecipeOut>(['recipe', '1'])?.is_favorite).toBe(false)
  })
})
