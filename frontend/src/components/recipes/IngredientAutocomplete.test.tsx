import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IngredientAutocomplete } from './IngredientAutocomplete'
import { type CatalogItemOut } from '@/lib/types'

const foodItem = {
  id: 'cat-1',
  canonical_name: 'Whole Milk',
  raw_name: 'Whole Milk 1L',
  brand: 'FarmFresh',
  is_food: true,
} as CatalogItemOut

const nonFoodItem = {
  id: 'cat-2',
  canonical_name: 'Dish Soap',
  raw_name: 'Dish Soap 500ml',
  brand: 'CleanCo',
  is_food: false,
} as CatalogItemOut

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCatalogMock = vi.fn((_params?: any) => ({
  data: { data: [foodItem, nonFoodItem], total: 2, limit: 20, offset: 0 },
  isLoading: false,
}))

vi.mock('@/hooks/useCatalog', () => ({
  useCatalog: (...args: unknown[]) => useCatalogMock(...args),
}))

describe('IngredientAutocomplete Component', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the "Food items only" toggle unchecked by default', async () => {
    const user = userEvent.setup()
    render(<IngredientAutocomplete onSelect={onSelect} />)

    await user.click(screen.getByPlaceholderText('Search catalog...'))

    const checkbox = screen.getByRole('checkbox', { name: /food items only/i })
    expect(checkbox).not.toBeChecked()
  })

  it('does not filter by is_food when the toggle is unchecked', async () => {
    const user = userEvent.setup()
    render(<IngredientAutocomplete onSelect={onSelect} />)

    await user.click(screen.getByPlaceholderText('Search catalog...'))

    expect(useCatalogMock).toHaveBeenLastCalledWith(expect.objectContaining({ is_food: undefined }))
  })

  it('filters to food items only when the toggle is checked', async () => {
    const user = userEvent.setup()
    render(<IngredientAutocomplete onSelect={onSelect} />)

    await user.click(screen.getByPlaceholderText('Search catalog...'))
    await user.click(screen.getByRole('checkbox', { name: /food items only/i }))

    expect(useCatalogMock).toHaveBeenLastCalledWith(expect.objectContaining({ is_food: true }))
  })

  it('shows a "(Non-food)" label only on non-food items', async () => {
    const user = userEvent.setup()
    render(<IngredientAutocomplete onSelect={onSelect} />)

    await user.click(screen.getByPlaceholderText('Search catalog...'))

    const nonFoodLabel = screen.getByText('(Non-food)')
    expect(nonFoodLabel).toBeInTheDocument()
    expect(nonFoodLabel).toHaveClass('text-on-surface-variant')
    expect(screen.getAllByText('(Non-food)')).toHaveLength(1)
  })
})
