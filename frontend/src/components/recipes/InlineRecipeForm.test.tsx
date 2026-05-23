import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InlineRecipeForm } from './InlineRecipeForm'

const mockCreateMutate = vi.fn()

vi.mock('@/hooks/useRecipes', () => ({
  useCreateRecipe: () => ({ mutate: mockCreateMutate, isPending: false }),
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('InlineRecipeForm', () => {
  const onSuccess = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render title and description fields', () => {
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })
      expect(screen.getByLabelText('Title *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('should render ingredient editor', () => {
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })
      expect(screen.getByTestId('ingredient-editor')).toBeInTheDocument()
    })

    it('should render submit and cancel buttons', () => {
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })
      expect(screen.getByRole('button', { name: 'Create & Add' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Back to Recipes' })).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('should show error when title is too short', async () => {
      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.type(screen.getByLabelText('Title *'), 'A')
      await user.click(screen.getByText('Mock Add Ingredient'))
      await user.click(screen.getByRole('button', { name: 'Create & Add' }))

      expect(screen.getByText('Title must be at least 2 characters')).toBeInTheDocument()
      expect(mockCreateMutate).not.toHaveBeenCalled()
    })

    it('should show error when no ingredients added', async () => {
      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.type(screen.getByLabelText('Title *'), 'Test Recipe')
      await user.click(screen.getByRole('button', { name: 'Create & Add' }))

      expect(screen.getByText('Add at least one ingredient')).toBeInTheDocument()
      expect(mockCreateMutate).not.toHaveBeenCalled()
    })
  })

  describe('submission', () => {
    it('should call createRecipe with correct data', async () => {
      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.type(screen.getByLabelText('Title *'), 'My Recipe')
      await user.type(screen.getByLabelText('Description'), 'Tasty dish')
      await user.click(screen.getByText('Mock Add Ingredient'))
      await user.click(screen.getByRole('button', { name: 'Create & Add' }))

      expect(mockCreateMutate).toHaveBeenCalledWith(
        {
          title: 'My Recipe',
          description: 'Tasty dish',
          ingredients: [{ catalog_item_id: 'cat-1', qty: 100, unit: 'g' }],
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })

    it('should call onSuccess with recipe id on successful creation', async () => {
      mockCreateMutate.mockImplementation(
        (_data: unknown, options: { onSuccess: (recipe: { id: string }) => void }) => {
          options.onSuccess({ id: 'new-recipe-id' })
        }
      )

      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.type(screen.getByLabelText('Title *'), 'My Recipe')
      await user.click(screen.getByText('Mock Add Ingredient'))
      await user.click(screen.getByRole('button', { name: 'Create & Add' }))

      expect(onSuccess).toHaveBeenCalledWith('new-recipe-id')
    })

    it('should show error on creation failure', async () => {
      mockCreateMutate.mockImplementation((_data: unknown, options: { onError: () => void }) => {
        options.onError()
      })

      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.type(screen.getByLabelText('Title *'), 'My Recipe')
      await user.click(screen.getByText('Mock Add Ingredient'))
      await user.click(screen.getByRole('button', { name: 'Create & Add' }))

      expect(screen.getByText('Failed to create recipe. Please try again.')).toBeInTheDocument()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('should omit description when empty', async () => {
      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.type(screen.getByLabelText('Title *'), 'My Recipe')
      await user.click(screen.getByText('Mock Add Ingredient'))
      await user.click(screen.getByRole('button', { name: 'Create & Add' }))

      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
        expect.anything()
      )
    })
  })

  describe('cancel', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<InlineRecipeForm onSuccess={onSuccess} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      })

      await user.click(screen.getByRole('button', { name: 'Back to Recipes' }))
      expect(onCancel).toHaveBeenCalled()
    })
  })
})
