import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealSlot } from './MealSlot'
import { MealTypeEnum } from '@/lib/types'

const mockMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockUpdateMutate = vi.fn()

vi.mock('@/hooks/useMealPlans', () => ({
  useCreateMealPlan: () => ({ mutate: mockMutate }),
  useDeleteMealPlan: () => ({ mutate: mockDeleteMutate }),
  useUpdateMealPlan: () => ({ mutate: mockUpdateMutate, isPending: false }),
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

const baseMealPlan = {
  id: 'mp-1',
  date: '2024-01-01',
  meal_type: MealTypeEnum.LUNCH,
  recipe_id: 'r-1',
  recipe_title: 'Pasta Carbonara',
  notes: null as string | null,
  created_at: '',
  updated_at: '',
}

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
    it('should render recipe title when meal plan exists', () => {
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
    })

    it('should show "Untitled" when recipe_title is null', () => {
      const untitledPlan = { ...baseMealPlan, recipe_title: null }
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={untitledPlan} />)
      expect(screen.getByText('Untitled')).toBeInTheDocument()
    })

    it('should call deleteMutation when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)

      const deleteButton = screen.getByText('close').closest('button')!
      await user.click(deleteButton)
      expect(mockDeleteMutate).toHaveBeenCalledWith('mp-1')
    })

    it('should not show add meal button', () => {
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)
      expect(screen.queryByText('Add meal')).not.toBeInTheDocument()
    })
  })

  describe('notes', () => {
    it('should show "Add notes..." placeholder when notes is null', () => {
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)
      expect(screen.getByText('Add notes...')).toBeInTheDocument()
    })

    it('should display notes when present', () => {
      const withNotes = { ...baseMealPlan, notes: 'Prep the night before' }
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={withNotes} />)
      expect(screen.getByText('Prep the night before')).toBeInTheDocument()
    })

    it('should truncate notes longer than 50 characters', () => {
      const longNote = 'A'.repeat(60)
      const withLongNotes = { ...baseMealPlan, notes: longNote }
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={withLongNotes} />)
      expect(screen.getByText('A'.repeat(50) + '...')).toBeInTheDocument()
    })

    it('should open textarea when "Add notes..." is clicked', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)

      await user.click(screen.getByText('Add notes...'))
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should open textarea with existing notes when notes are clicked', async () => {
      const user = userEvent.setup()
      const withNotes = { ...baseMealPlan, notes: 'Existing note' }
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={withNotes} />)

      await user.click(screen.getByText('Existing note'))
      expect(screen.getByRole('textbox')).toHaveValue('Existing note')
    })

    it('should save notes on blur', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)

      await user.click(screen.getByText('Add notes...'))
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'New note')
      await user.tab()

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { id: 'mp-1', data: { notes: 'New note' } },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })

    it('should not save if notes unchanged', async () => {
      const user = userEvent.setup()
      const withNotes = { ...baseMealPlan, notes: 'Same note' }
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={withNotes} />)

      await user.click(screen.getByText('Same note'))
      await user.tab()

      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })

    it('should cancel editing on Escape', async () => {
      const user = userEvent.setup()
      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)

      await user.click(screen.getByText('Add notes...'))
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Will be cancelled')
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })

    it('should show "Saved" indicator after successful save', async () => {
      const user = userEvent.setup()
      mockUpdateMutate.mockImplementation((_args: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<MealSlot date="2024-01-01" mealType={MealTypeEnum.LUNCH} mealPlan={baseMealPlan} />)

      await user.click(screen.getByText('Add notes...'))
      await user.type(screen.getByRole('textbox'), 'Test')
      await user.tab()

      expect(screen.getByText('Saved')).toBeInTheDocument()
    })
  })
})
