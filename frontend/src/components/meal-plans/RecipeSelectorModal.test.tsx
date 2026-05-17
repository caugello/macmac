import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeSelectorModal } from './RecipeSelectorModal'

const mockRecipes = {
  data: [
    { id: 'r1', title: 'Pasta Carbonara', description: 'Classic Italian', ingredients: [] },
    { id: 'r2', title: 'Chicken Curry', description: null, ingredients: [] },
  ],
  total: 2,
}

vi.mock('@/hooks/useRecipes', () => ({
  useRecipes: () => ({ data: mockRecipes, isLoading: false, error: null }),
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

describe('RecipeSelectorModal Component', () => {
  const onSelect = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the modal title', () => {
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)
      expect(screen.getByText('Select Recipe')).toBeInTheDocument()
    })

    it('should render the search bar', () => {
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)
      expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    })

    it('should render recipe options', () => {
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
      expect(screen.getByText('Chicken Curry')).toBeInTheDocument()
    })

    it('should render recipe descriptions', () => {
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)
      expect(screen.getByText('Classic Italian')).toBeInTheDocument()
      expect(screen.getByText('No description')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onSelect with recipe id when recipe is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)

      await user.click(screen.getByText('Pasta Carbonara'))
      expect(onSelect).toHaveBeenCalledWith('r1')
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)

      const closeButton = screen.getByText('close').closest('button')!
      await user.click(closeButton)
      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<RecipeSelectorModal onSelect={onSelect} onClose={onClose} />)

      const backdrop = screen.getByText('Select Recipe').closest('.flex.flex-col')!.parentElement!
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    })
  })
})
