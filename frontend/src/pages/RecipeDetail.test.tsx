import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecipeDetail } from './RecipeDetail'
import { ToastProvider } from '@/components/ui/toast'
import * as useRecipesHook from '@/hooks/useRecipes'

const mockUseRecipe = vi.fn()
const mockUseDeleteRecipe = vi.fn()
const mockNavigate = vi.fn()

vi.spyOn(useRecipesHook, 'useRecipe').mockImplementation(mockUseRecipe)
vi.spyOn(useRecipesHook, 'useDeleteRecipe').mockImplementation(mockUseDeleteRecipe)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const createWrapper = (initialRoute = '/recipes/1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  window.history.pushState({}, '', initialRoute)
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <Routes>
            <Route path="/recipes/:id" element={children} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

describe('RecipeDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDeleteRecipe.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  describe('loading state', () => {
    it('should show loading skeleton', () => {
      mockUseRecipe.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      const { container } = render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error message when recipe not found', () => {
      mockUseRecipe.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Recipe not found.')).toBeInTheDocument()
      expect(screen.getByText('Back to Recipes')).toBeInTheDocument()
    })

    it('should show error message when recipe is null', () => {
      mockUseRecipe.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Recipe not found.')).toBeInTheDocument()
    })
  })

  describe('with recipe data', () => {
    const mockRecipe = {
      id: '1',
      title: 'Pasta Carbonara',
      description: 'Classic Italian pasta dish',
      ingredients: [
        { catalog_item_name: 'Spaghetti', qty: 400, unit: 'g' },
        { catalog_item_name: 'Eggs', qty: 4, unit: 'pcs' },
      ],
      steps: ['Boil pasta', 'Cook bacon', 'Mix with eggs'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }

    beforeEach(() => {
      mockUseRecipe.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        error: null,
      })
    })

    it('should render recipe title', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    })

    it('should render recipe description', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Classic Italian pasta dish')).toBeInTheDocument()
    })

    it('should not render description section when description is missing', () => {
      mockUseRecipe.mockReturnValue({
        data: { ...mockRecipe, description: null },
        isLoading: false,
        error: null,
      })

      const { container } = render(<RecipeDetail />, { wrapper: createWrapper() })
      const paragraphs = container.querySelectorAll('p.text-lg')
      expect(paragraphs.length).toBe(0)
    })

    it('should render ingredients', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Ingredients')).toBeInTheDocument()
      expect(screen.getByText('400 g')).toBeInTheDocument()
      expect(screen.getByText('Spaghetti')).toBeInTheDocument()
      expect(screen.getByText('4 pcs')).toBeInTheDocument()
      expect(screen.getByText('Eggs')).toBeInTheDocument()
    })

    it('should render steps', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Steps')).toBeInTheDocument()
      expect(screen.getByText('Boil pasta')).toBeInTheDocument()
      expect(screen.getByText('Cook bacon')).toBeInTheDocument()
      expect(screen.getByText('Mix with eggs')).toBeInTheDocument()
    })

    it('should not render steps section when steps are empty', () => {
      mockUseRecipe.mockReturnValue({
        data: { ...mockRecipe, steps: [] },
        isLoading: false,
        error: null,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Steps')).not.toBeInTheDocument()
    })

    it('should not render servings when missing', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText(/serving/)).not.toBeInTheDocument()
    })

    it('should render servings when present', () => {
      mockUseRecipe.mockReturnValue({
        data: { ...mockRecipe, servings: 4 },
        isLoading: false,
        error: null,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('4 servings')).toBeInTheDocument()
    })

    it('should render singular serving for 1', () => {
      mockUseRecipe.mockReturnValue({
        data: { ...mockRecipe, servings: 1 },
        isLoading: false,
        error: null,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('1 serving')).toBeInTheDocument()
    })

    it('should render creation date', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText(/Created:/)).toBeInTheDocument()
    })

    it('should render update date', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    })

    it('should render Back button', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      const backButtons = screen.getAllByText('Back')
      expect(backButtons[0]).toBeInTheDocument()
    })

    it('should render Edit button', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    it('should render Delete button', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should link Edit button to edit page', () => {
      render(<RecipeDetail />, { wrapper: createWrapper() })
      const editLink = screen.getByText('Edit').closest('a')
      expect(editLink).toHaveAttribute('href', '/recipes/1/edit')
    })

    it('should disable Delete button when deletion is pending', () => {
      mockUseDeleteRecipe.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })
      const deleteButton = screen.getByText('Delete')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('delete functionality', () => {
    const mockRecipe = {
      id: '1',
      title: 'Test Recipe',
      ingredients: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    beforeEach(() => {
      mockUseRecipe.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        error: null,
      })
    })

    it('should show confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup()

      render(<RecipeDetail />, { wrapper: createWrapper() })

      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      expect(screen.getByText('Delete recipe?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should not delete when user cancels', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()
      mockUseDeleteRecipe.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Delete'))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('should delete when user confirms', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn((_id, callbacks) => {
        callbacks.onSuccess()
      })
      mockUseDeleteRecipe.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Delete'))
      await user.click(screen.getByRole('button', { name: /^Delete$/ }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('1', expect.any(Object))
      })
    })

    it('should navigate to recipes list after successful deletion', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn((_id, callbacks) => {
        callbacks.onSuccess()
      })
      mockUseDeleteRecipe.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Delete'))
      await user.click(screen.getByRole('button', { name: /^Delete$/ }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/recipes')
      })
    })

    it('should show error toast on deletion error', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn((_id, callbacks) => {
        callbacks.onError()
      })
      mockUseDeleteRecipe.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      render(<RecipeDetail />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Delete'))
      await user.click(screen.getByRole('button', { name: /^Delete$/ }))

      await waitFor(() => {
        expect(screen.getByText('Failed to delete recipe')).toBeInTheDocument()
      })
    })
  })
})
