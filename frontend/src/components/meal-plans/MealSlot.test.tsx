import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealSlot } from './MealSlot'
import { MealTypeEnum } from '@/lib/types'

const mockMutate = vi.fn()
const mockDeleteMutate = vi.fn()

vi.mock('@/hooks/useMealPlans', () => ({
  useCreateMealPlan: () => ({ mutate: mockMutate }),
  useDeleteMealPlan: () => ({ mutate: mockDeleteMutate }),
}))

vi.mock('./RecipeSelectorModal', () => ({
  RecipeSelectorModal: ({
    onSelect,
    onClose,
  }: {
    date: string
    mealType: string
    onSelect: (id: string) => void
    onClose: () => void
  }) => (
    <div data-testid="recipe-selector">
      <button onClick={() => onSelect('recipe-1')}>Select Recipe</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

describe('MealSlot Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty slot', () => {
    it('should render add meal button when no meal plan exists', () => {
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} />)
      expect(screen.getByText('Add meal')).toBeInTheDocument()
    })

    it('should open recipe selector when add meal is clicked', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} />)

      await user.click(screen.getByText('Add meal'))
      expect(screen.getByTestId('recipe-selector')).toBeInTheDocument()
    })

    it('should call createMutation when recipe is selected', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} />)

      await user.click(screen.getByText('Add meal'))
      await user.click(screen.getByText('Select Recipe'))

      expect(mockMutate).toHaveBeenCalledWith(
        { date: '2024-01-01', meal_type: MealTypeEnum.LUNCH, recipe_id: 'recipe-1' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  describe('filled slot', () => {
    const mealPlan = {
      id: 'mp-1',
      date: '2024-01-01',
      meal_type: MealTypeEnum.LUNCH,
      recipe_id: 'r-1',
      recipe_title: 'Pasta Carbonara',
      created_at: '',
      updated_at: '',
    }

    it('should render recipe title when meal plan exists', () => {
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={mealPlan} />)
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    })

    it('should show "Untitled" when recipe_title is null', () => {
      const untitledPlan = { ...mealPlan, recipe_title: null }
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={untitledPlan} />)
      expect(screen.getByText('Untitled')).toBeInTheDocument()
    })

    it('should call deleteMutation when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={mealPlan} />)

      const deleteButton = screen.getByText('close').closest('button')!
      await user.click(deleteButton)
      expect(mockDeleteMutate).toHaveBeenCalledWith('mp-1')
    })

    it('should not show add meal button', () => {
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={mealPlan} />)
      expect(screen.queryByText('Add meal')).not.toBeInTheDocument()
    })
  })
})
