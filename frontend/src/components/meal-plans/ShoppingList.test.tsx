import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShoppingList } from './ShoppingList'

const mockMutate = vi.fn()
let mockData: ReturnType<typeof createMockData> | undefined
let mockIsPending = false

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
          category: 'Dairy',
        },
        {
          catalog_item_id: 'c2',
          catalog_item_name: 'Butter',
          total_qty: 1,
          unit: 'pc',
          price: 2.0,
          category: 'Dairy',
        },
      ],
      Produce: [
        {
          catalog_item_id: 'c3',
          catalog_item_name: 'Tomatoes',
          total_qty: 500,
          unit: 'g',
          price: null,
          category: 'Produce',
        },
      ],
    },
    total_items: 3,
    estimated_total: 3.5 as number | null,
  }
}

vi.mock('@/hooks/useMealPlans', () => ({
  useGenerateShoppingList: () => ({
    mutate: mockMutate,
    data: mockData,
    isPending: mockIsPending,
  }),
}))

describe('ShoppingList Component', () => {
  const weekStart = new Date('2024-01-01')
  const weekEnd = new Date('2024-01-07')

  beforeEach(() => {
    vi.clearAllMocks()
    mockData = undefined
    mockIsPending = false
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
      expect(screen.getByText('€3.50')).toBeInTheDocument()
    })

    it('should render export and print buttons', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess()
      })

      render(<ShoppingList weekStart={weekStart} weekEnd={weekEnd} />)
      await user.click(screen.getByText('Generate Shopping List'))

      expect(screen.getByText('Export')).toBeInTheDocument()
      expect(screen.getByText('Print List')).toBeInTheDocument()
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
})
