import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShoppingListModal } from './ShoppingListModal'

const mockMutate = vi.fn()
const mockReset = vi.fn()
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
          last_enriched_at: new Date().toISOString(),
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
          last_enriched_at: null,
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
          last_enriched_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
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
    reset: mockReset,
    data: mockData,
    isPending: mockIsPending,
    isError: mockIsError,
    error: mockError,
  }),
}))

const weekStart = new Date('2024-01-01')
const weekEnd = new Date('2024-01-07')

const renderModal = (open = true) =>
  render(
    <ShoppingListModal open={open} onOpenChange={vi.fn()} weekStart={weekStart} weekEnd={weekEnd} />
  )

describe('ShoppingListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockData = undefined
    mockIsPending = false
    mockIsError = false
    mockError = null
  })

  describe('open behaviour', () => {
    it('should generate the shopping list with formatted dates when opened', () => {
      renderModal(true)
      expect(mockMutate).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      })
    })

    it('should not generate when closed', () => {
      renderModal(false)
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show a spinner while generating', () => {
      mockIsPending = true
      renderModal(true)
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
  })

  describe('with generated data', () => {
    beforeEach(() => {
      mockData = createMockData()
    })

    it('should render category sections', () => {
      renderModal(true)
      expect(screen.getByText('Dairy')).toBeInTheDocument()
      expect(screen.getByText('Produce')).toBeInTheDocument()
    })

    it('should render item names', () => {
      renderModal(true)
      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Butter')).toBeInTheDocument()
      expect(screen.getByText('Tomatoes')).toBeInTheDocument()
    })

    it('should render totals', () => {
      renderModal(true)
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('€5.00')).toBeInTheDocument()
    })

    it('should show a dash when estimated_total is null', () => {
      mockData = { ...createMockData(), estimated_total: null }
      renderModal(true)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('should show the promotion badge for items on promotion', () => {
      renderModal(true)
      expect(screen.getByText('Promo')).toBeInTheDocument()
    })

    it('should show quantity and package info', () => {
      renderModal(true)
      expect(screen.getByText('2 l')).toBeInTheDocument()
      expect(screen.getByText(/buy 2 x 1l/)).toBeInTheDocument()
      expect(screen.getByText('500 g')).toBeInTheDocument()
    })

    it('should show a warning icon for stale prices', () => {
      renderModal(true)
      expect(screen.getAllByText('warning').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('print', () => {
    it('should render a Print button when data is present', () => {
      mockData = createMockData()
      renderModal(true)
      expect(screen.getByRole('button', { name: /Print/ })).toBeInTheDocument()
    })

    it('should call window.print when the Print button is clicked', async () => {
      const user = userEvent.setup()
      const printSpy = vi.fn()
      vi.stubGlobal('print', printSpy)
      mockData = createMockData()

      renderModal(true)
      await user.click(screen.getByRole('button', { name: /Print/ }))

      expect(printSpy).toHaveBeenCalledOnce()
      vi.unstubAllGlobals()
    })
  })

  describe('error state', () => {
    it('should show the 404 message', () => {
      mockIsError = true
      mockError = { response: { status: 404 } }
      renderModal(true)
      expect(screen.getByText(/Add some recipes first/)).toBeInTheDocument()
    })

    it('should show the generic 500 message', () => {
      mockIsError = true
      mockError = { response: { status: 500 } }
      renderModal(true)
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    })

    it('should show a fallback message for unknown errors', () => {
      mockIsError = true
      mockError = new Error('Network error')
      renderModal(true)
      expect(screen.getByText('Failed to generate shopping list.')).toBeInTheDocument()
    })

    it('should retry generation when the retry button is clicked', async () => {
      const user = userEvent.setup()
      mockIsError = true
      mockError = { response: { status: 500 } }
      renderModal(true)
      mockMutate.mockClear()

      await user.click(screen.getByText('Try again'))

      expect(mockMutate).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      })
    })
  })
})
