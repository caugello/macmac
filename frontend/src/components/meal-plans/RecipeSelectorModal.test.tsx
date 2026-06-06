import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecipeSelectorModal } from './RecipeSelectorModal'
import { MealTypeEnum } from '@/lib/types'

const mockRecipes = {
  data: [
    { id: 'r1', title: 'Pasta Carbonara', description: 'Classic Italian', ingredients: [] },
    { id: 'r2', title: 'Chicken Curry', description: null, ingredients: [] },
  ],
  total: 2,
}

const mockMealPlanMutate = vi.fn()

vi.mock('@/hooks/useRecipes', () => ({
  useRecipes: () => ({ data: mockRecipes, isLoading: false, error: null }),
}))

vi.mock('@/hooks/useMealPlans', () => ({
  useCreateMealPlan: () => ({ mutate: mockMealPlanMutate }),
}))

vi.mock('@/components/shared/SearchBar', () => ({
  SearchBar: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (v: string) => void
    placeholder: string
  }) => (
    <input
      data-testid="search-bar"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

vi.mock('@/components/recipes/InlineRecipeForm', () => ({
  InlineRecipeForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: (id: string) => void
    onCancel: () => void
  }) => (
    <div data-testid="inline-recipe-form">
      <button onClick={() => onSuccess('new-recipe-id')}>Mock Create Recipe</button>
      <button onClick={onCancel}>Mock Cancel</button>
    </div>
  ),
}))

const defaultProps = {
  date: '2024-01-15',
  mealType: MealTypeEnum.LUNCH,
  onSelect: vi.fn(),
  onClose: vi.fn(),
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('RecipeSelectorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('select mode', () => {
    it('should render the modal title', () => {
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Select Recipe')).toBeInTheDocument()
    })

    it('should render the search bar', () => {
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    })

    it('should render recipe options', () => {
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
      expect(screen.getByText('Chicken Curry')).toBeInTheDocument()
    })

    it('should render recipe descriptions', () => {
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Classic Italian')).toBeInTheDocument()
      expect(screen.getByText('No description')).toBeInTheDocument()
    })

    it('should render Create New Recipe button', () => {
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Create New Recipe')).toBeInTheDocument()
    })

    it('should render category quick filters above the search bar', () => {
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /Breakfast/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Dessert/ })).toBeInTheDocument()
    })

    it('should toggle a category quick filter when clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      const chip = screen.getByRole('button', { name: /Dessert/ })
      expect(chip).toHaveAttribute('aria-pressed', 'false')
      await user.click(chip)
      expect(chip).toHaveAttribute('aria-pressed', 'true')
    })

    it('should call onSelect with recipe id when recipe is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Pasta Carbonara'))
      expect(defaultProps.onSelect).toHaveBeenCalledWith('r1')
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      const closeButton = screen.getByText('close').closest('button')!
      await user.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      const backdrop = screen.getByText('Select Recipe').closest('.flex.flex-col')!.parentElement!
      await user.click(backdrop)
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('create mode', () => {
    it('should switch to create mode when Create New Recipe is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Create New Recipe'))

      expect(screen.getByText('New Recipe')).toBeInTheDocument()
      expect(screen.getByTestId('inline-recipe-form')).toBeInTheDocument()
      expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument()
    })

    it('should switch back to select mode when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Create New Recipe'))
      expect(screen.getByTestId('inline-recipe-form')).toBeInTheDocument()

      await user.click(screen.getByText('Mock Cancel'))
      expect(screen.getByText('Select Recipe')).toBeInTheDocument()
      expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    })

    it('should create meal plan after recipe is created', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Create New Recipe'))
      await user.click(screen.getByText('Mock Create Recipe'))

      expect(mockMealPlanMutate).toHaveBeenCalledWith(
        {
          date: '2024-01-15',
          meal_type: MealTypeEnum.LUNCH,
          recipe_id: 'new-recipe-id',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })

    it('should close modal on successful meal plan creation', async () => {
      mockMealPlanMutate.mockImplementation(
        (_data: unknown, options: { onSuccess: () => void }) => {
          options.onSuccess()
        }
      )

      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Create New Recipe'))
      await user.click(screen.getByText('Mock Create Recipe'))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should close modal even on meal plan creation error', async () => {
      mockMealPlanMutate.mockImplementation((_data: unknown, options: { onError: () => void }) => {
        options.onError()
      })

      const user = userEvent.setup()
      render(<RecipeSelectorModal {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Create New Recipe'))
      await user.click(screen.getByText('Mock Create Recipe'))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })
})
