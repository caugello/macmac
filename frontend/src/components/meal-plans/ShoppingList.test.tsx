import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShoppingList } from './ShoppingList'

const mockMutate = vi.fn()
let mockData: ReturnType<typeof createMockData> | undefined
let mockIsPending = false
let mockIsError = false
let mockError: unknown = null

function createMockData() {
  return {
    items_by_category: {
      Dairy: [
        {
          catalog_item_id: 'c1',
          catalog_item_name: 'Milk',
          total_qty: 2,
          unit: 'l',
          price: 1.5,
          line_total: 3.0,
          category: 'Dairy',
          is_on_promotion: true,
          promotion_until_date: '2099-12-31',
          package_size: 1,
          package_unit: 'l',
          packages_needed: 2,
        },
        {
          catalog_item_id: 'c2',
          catalog_item_name: 'Butter',
          total_qty: 1,
          unit: 'pc',
          price: 2.0,
          line_total: 2.0,
          category: 'Dairy',
          is_on_promotion: false,
          promotion_until_date: null,
          package_size: null,
          package_unit: null,
          packages_needed: null,
        },
      ],
      Produce: [
        {
          catalog_item_id: 'c3',
          catalog_item_name: 'Tomatoes',
          total_qty: 500,
          unit: 'g',
          price: null,
          line_total: null,
          category: 'Produce',
          is_on_promotion: false,
          promotion_until_date: null,
          package_size: null,
          package_unit: null,
          packages_needed: null,
        },
      ],
    },
    total_items: 3,
    estimated_total: 5.0 as number | null,
  }
}

vi.mock('@/hooks/useMealPlans', () => ({
  useGenerateShoppingList: () => ({
    mutate: mockMutate,
    data: mockData,
    isPending: mockIsPending,
    isError: mockIsError,
    error: mockError,
  }),
}))

describe('ShoppingList Component', () => {
  const weekStart = new Date('2024-01-01')
  const weekEnd = new Date('2024-01-07')

  beforeEach(() => {
    vi.clearAllMocks()
    mockData = undefined
    mockIsPending = false
    mockIsError = false
    mockError = null
  })

  describe('rendering', () => {
    it('should render generate button', () => {
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.getByText('Generate Shopping List')).toBeInTheDocument()
    })

    it('should not show shopping list initially', () => {
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.queryByText('Total Items')).not.toBeInTheDocument()
    })
  })

  describe('generate action', () => {
    it('should call generate mutation with formatted dates when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)

      await user.click(screen.getByText('Generate Shopping List'))
      expect(mockMutate).toHaveBeenCalledWith(
        { start_date: '2024-01-01', end_date: '2024-01-07' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })

    it('should show loading message when pending', () => {
      mockIsPending = true
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
  })

  describe('with generated data', () => {
    it('should render category sections after generation', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('Dairy')).toBeInTheDocument()
      expect(screen.getByText('Produce')).toBeInTheDocument()
    })

    it('should render item names after generation', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Butter')).toBeInTheDocument()
      expect(screen.getByText('Tomatoes')).toBeInTheDocument()
    })

    it('should render totals after generation', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('€5.00')).toBeInTheDocument()
    })

    it('should show dash when estimated_total is null', async () => {
      const user = userEvent.setup()
      mockData = { ...createMockData(), estimated_total: null }
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('should show promotion badge for items on promotion', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('Promo')).toBeInTheDocument()
    })

    it('should show need and package info when packages_needed is set', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('2 l')).toBeInTheDocument()
      expect(screen.getByText(/buy 2 x 1l/)).toBeInTheDocument()
      expect(screen.getByText('1 pc')).toBeInTheDocument()
      expect(screen.queryByText(/buy.*pc/)).not.toBeInTheDocument()
      expect(screen.getByText('500 g')).toBeInTheDocument()
    })

    it('should render category item counts as badges', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('error states', () => {
    it('should show "Add some recipes" message on 404 error', () => {
      mockIsError = true
      mockError = { response: { status: 404 } }
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.getByText(/Add some recipes first/)).toBeInTheDocument()
    })

    it('should show generic error message on 500 error', () => {
      mockIsError = true
      mockError = { response: { status: 500 } }
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    })

    it('should show fallback error message for unknown errors', () => {
      mockIsError = true
      mockError = new Error('Network error')
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.getByText('Failed to generate shopping list.')).toBeInTheDocument()
    })

    it('should show retry button on error', () => {
      mockIsError = true
      mockError = { response: { status: 500 } }
      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })
})
