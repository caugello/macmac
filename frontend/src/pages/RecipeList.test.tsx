import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecipeList } from './RecipeList'
import * as useRecipesHook from '@/hooks/useRecipes'

const mockUseRecipes = vi.fn()
const mockUseRecipeCategoryCounts = vi.fn()

vi.spyOn(useRecipesHook, 'useRecipes').mockImplementation(mockUseRecipes)
vi.spyOn(useRecipesHook, 'useRecipeCategoryCounts').mockImplementation(mockUseRecipeCategoryCounts)

mockUseRecipeCategoryCounts.mockReturnValue({ data: { counts: {} } })

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

// The category chips are revealed via the "tune" control, mirroring the Stitch layout.
const openCategoryFilters = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /toggle category filters/i }))
}

describe('RecipeList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading message', () => {
      mockUseRecipes.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText('Loading recipes...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error message', () => {
      mockUseRecipes.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
      })

      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText(/Error loading recipes/i)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show no recipes message', () => {
      mockUseRecipes.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })

      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText('Your kitchen awaits')).toBeInTheDocument()
      expect(screen.getByText('Create a recipe')).toBeInTheDocument()
    })
  })

  describe('with recipes', () => {
    const mockRecipes = {
      data: [
        {
          id: '1',
          title: 'Pasta Carbonara',
          description: 'Classic Italian pasta',
          ingredients: [{ name: 'pasta' }, { name: 'eggs' }],
        },
        {
          id: '2',
          title: 'Chicken Curry',
          description: 'Spicy Indian dish',
          ingredients: [{ name: 'chicken' }, { name: 'curry' }, { name: 'rice' }],
        },
      ],
      total: 2,
    }

    beforeEach(() => {
      mockUseRecipes.mockReturnValue({
        data: mockRecipes,
        isLoading: false,
        error: null,
      })
    })

    it('should render page title', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByRole('heading', { level: 1, name: 'All recipes' })).toBeInTheDocument()
    })

    it('should render the saved recipe count', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText('2 recipes saved')).toBeInTheDocument()
    })

    it('should render create recipe button', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText('Create Recipe')).toBeInTheDocument()
    })

    it('should render search bar', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument()
    })

    it('should render all recipes in a uniform grid', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      // No featured hero: every recipe is a level-3 card heading.
      expect(screen.getByRole('heading', { level: 3, name: 'Pasta Carbonara' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Chicken Curry' })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: /featured recipe/i })).not.toBeInTheDocument()
    })

    it('should render recipe cards', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
      expect(screen.getByText('Chicken Curry')).toBeInTheDocument()
    })

    it('should link to recipe detail pages', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      const link1 = screen.getByText('Pasta Carbonara').closest('a')
      const link2 = screen.getByText('Chicken Curry').closest('a')
      expect(link1).toHaveAttribute('href', '/recipes/1')
      expect(link2).toHaveAttribute('href', '/recipes/2')
    })

    it('should link create button to /recipes/new', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      const createButton = screen.getByText('Create Recipe').closest('a')
      expect(createButton).toHaveAttribute('href', '/recipes/new')
    })

    it('should not render pagination when total is less than limit', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      // Pagination should not appear when total (2) is less than limit (20)
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should render pagination when total exceeds limit', () => {
      mockUseRecipes.mockReturnValue({
        data: {
          data: Array(20)
            .fill(null)
            .map((_, i) => ({ id: String(i), title: 'Recipe', ingredients: [] })),
          total: 50,
        },
        isLoading: false,
        error: null,
      })

      render(<RecipeList />, { wrapper: createWrapper() })
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('category filtering', () => {
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({
        data: {
          data: [
            { id: '1', title: 'Pancakes', category: 'breakfast', ingredients: [] },
            { id: '2', title: 'Steak', category: 'main', ingredients: [] },
          ],
          total: 2,
        },
        isLoading: false,
        error: null,
      })
    })

    it('should reveal category filter chips via the tune control', async () => {
      const user = userEvent.setup()
      render(<RecipeList />, { wrapper: createWrapper() })

      await openCategoryFilters(user)

      expect(screen.getByRole('button', { name: /Breakfast/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Dessert/ })).toBeInTheDocument()
    })

    it('should render category badges on recipe cards', () => {
      render(<RecipeList />, { wrapper: createWrapper() })
      // The Pancakes card carries a "Breakfast" category badge even before the
      // filter chips are revealed.
      expect(screen.getByText('Breakfast')).toBeInTheDocument()
    })

    it('should call useRecipes with the selected category on toggle', async () => {
      const user = userEvent.setup()
      render(<RecipeList />, { wrapper: createWrapper() })

      await openCategoryFilters(user)
      await user.click(screen.getByRole('button', { name: /Dessert/ }))

      await waitFor(() => {
        expect(mockUseRecipes).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'dessert' })
        )
      })
    })
  })

  describe('search functionality', () => {
    it('should call useRecipes with search term', async () => {
      const user = userEvent.setup()
      mockUseRecipes.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })

      render(<RecipeList />, { wrapper: createWrapper() })

      const searchInput = screen.getByPlaceholderText('Search recipes...')
      await user.type(searchInput, 'pasta')

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockUseRecipes).toHaveBeenCalledWith(expect.objectContaining({ search: 'pasta' }))
        },
        { timeout: 1000 }
      )
    })
  })

  describe('pagination', () => {
    it('should call useRecipes with correct offset when page changes', async () => {
      const user = userEvent.setup()
      mockUseRecipes.mockReturnValue({
        data: {
          data: Array(20)
            .fill(null)
            .map((_, i) => ({ id: String(i), title: 'Recipe', ingredients: [] })),
          total: 50,
        },
        isLoading: false,
        error: null,
      })

      render(<RecipeList />, { wrapper: createWrapper() })

      // Click page 2
      const page2Button = screen.getByText('2')
      await user.click(page2Button)

      await waitFor(() => {
        expect(mockUseRecipes).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 }))
      })
    })
  })
})
