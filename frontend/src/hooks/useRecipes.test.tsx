import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useRecipes,
  useRecipe,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from './useRecipes'
import { recipesApi } from '../api/recipes'

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
      steps: null,
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
      steps: null,
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
      steps: null,
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
