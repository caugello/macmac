import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecipeForm } from './RecipeForm'

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const mockRecipeData = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/hooks/useRecipes', () => ({
  useCreateRecipe: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateRecipe: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useRecipe: (id: string) => ({
    data: mockRecipeData(id),
    isLoading: false,
  }),
}))

vi.mock('@/components/recipes/IngredientEditor', () => ({
  IngredientEditor: ({
    ingredients,
    onChange,
  }: {
    ingredients: unknown[]
    onChange: (v: unknown[]) => void
  }) => (
    <div data-testid="ingredient-editor">
      <span>{ingredients.length} ingredients</span>
      <button
        type="button"
        onClick={() =>
          onChange([...ingredients, { catalog_item_id: 'cat-1', qty: 100, unit: 'g' }])
        }
      >
        Mock Add Ingredient
      </button>
    </div>
  ),
}))

const createWrapper = (initialPath = '/recipes/new') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/recipes/new" element={children} />
          <Route path="/recipes/:id/edit" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

describe('RecipeForm Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecipeData.mockReturnValue(undefined)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  describe('create mode', () => {
    it('should render create page title', () => {
      render(<RecipeForm />, { wrapper: createWrapper() })
      expect(screen.getByRole('heading', { name: 'Create Recipe' })).toBeInTheDocument()
    })

    it('should render form fields', () => {
      render(<RecipeForm />, { wrapper: createWrapper() })
      expect(screen.getByLabelText('Recipe Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByTestId('ingredient-editor')).toBeInTheDocument()
    })

    it('should render image placeholder', () => {
      render(<RecipeForm />, { wrapper: createWrapper() })
      expect(screen.getByText('Add a photo')).toBeInTheDocument()
    })

    it('should render submit and cancel buttons', () => {
      render(<RecipeForm />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /Create Recipe/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should render steps textarea', () => {
      render(<RecipeForm />, { wrapper: createWrapper() })
      expect(screen.getByPlaceholderText('Enter each step on a new line...')).toBeInTheDocument()
    })

    it('should alert if no ingredients on submit', async () => {
      const user = userEvent.setup()
      render(<RecipeForm />, { wrapper: createWrapper() })

      const titleInput = screen.getByLabelText('Recipe Title *')
      await user.type(titleInput, 'Test Recipe')

      await user.click(screen.getByRole('button', { name: /Create Recipe/ }))
      expect(window.alert).toHaveBeenCalledWith('Please add at least one ingredient')
    })

    it('should call createRecipe with correct data', async () => {
      const user = userEvent.setup()
      render(<RecipeForm />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText('Recipe Title *'), 'My Recipe')
      await user.type(screen.getByLabelText('Description'), 'Delicious dish')
      await user.click(screen.getByText('Mock Add Ingredient'))
      await user.type(
        screen.getByPlaceholderText('Enter each step on a new line...'),
        'Step 1\nStep 2'
      )

      await user.click(screen.getByRole('button', { name: /Create Recipe/ }))

      expect(mockCreateMutate).toHaveBeenCalledWith(
        {
          title: 'My Recipe',
          description: 'Delicious dish',
          ingredients: [{ catalog_item_id: 'cat-1', qty: 100, unit: 'g' }],
          steps: ['Step 1', 'Step 2'],
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })

    it('should navigate to /recipes on cancel', async () => {
      const user = userEvent.setup()
      render(<RecipeForm />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockNavigate).toHaveBeenCalledWith('/recipes')
    })
  })

  describe('edit mode', () => {
    beforeEach(() => {
      mockRecipeData.mockReturnValue({
        id: 'r1',
        title: 'Existing Recipe',
        description: 'Existing description',
        ingredients: [
          { catalog_item_id: 'cat-1', catalog_item_name: 'Flour', qty: 500, unit: 'g' },
        ],
        steps: ['Mix ingredients', 'Bake'],
      })
    })

    it('should render edit page title', () => {
      render(<RecipeForm />, { wrapper: createWrapper('/recipes/r1/edit') })
      expect(screen.getByText('Edit Recipe')).toBeInTheDocument()
    })

    it('should pre-fill title from existing recipe', () => {
      render(<RecipeForm />, { wrapper: createWrapper('/recipes/r1/edit') })
      expect(screen.getByDisplayValue('Existing Recipe')).toBeInTheDocument()
    })

    it('should pre-fill description from existing recipe', () => {
      render(<RecipeForm />, { wrapper: createWrapper('/recipes/r1/edit') })
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument()
    })

    it('should render update button instead of create', () => {
      render(<RecipeForm />, { wrapper: createWrapper('/recipes/r1/edit') })
      expect(screen.getByRole('button', { name: 'Update Recipe' })).toBeInTheDocument()
    })

    it('should navigate back to recipe detail on cancel', async () => {
      const user = userEvent.setup()
      render(<RecipeForm />, { wrapper: createWrapper('/recipes/r1/edit') })

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockNavigate).toHaveBeenCalledWith('/recipes/r1')
    })
  })
})
