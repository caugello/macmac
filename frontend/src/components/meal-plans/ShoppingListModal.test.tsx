import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ShoppingListModal } from './ShoppingListModal'
import type { ShoppingListItem } from '@/lib/types'

const mockMutate = vi.fn()
const mockReset = vi.fn()
let mockData: ReturnType<typeof createMockData> | undefined
let mockIsPending = false
let mockIsError = false
let mockError: unknown = null

function createMockData() {
  const items_by_category: Record<string, ShoppingListItem[]> = {
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
  }
  const extras: ShoppingListItem[] = [
    {
      catalog_item_id: 'e1',
      catalog_item_name: 'Toilet Paper',
      total_qty: 1,
      unit: 'pc',
      price: 4.5,
      line_total: 4.5,
      category: null,
      is_on_promotion: false,
      promotion_until_date: null,
      package_size: null,
      package_unit: null,
      packages_needed: null,
      last_enriched_at: null,
    },
  ]
  return {
    items_by_category,
    extras,
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

// addItem is awaited before the list regenerates, so it must resolve.
const { mockAddItem, sampleCatalogItem } = vi.hoisted(() => ({
  mockAddItem: vi.fn(),
  sampleCatalogItem: {
    id: 'cat-99',
    vendor_name: 'colruyt',
    raw_name: 'Olive Oil',
    product_url: 'https://example.com/oil',
    canonical_name: 'Olive Oil',
    normalized_name: 'olive_oil',
    brand: 'BrandX',
    net_quantity_value: 1,
    net_quantity_unit: 'l',
    is_food: true,
    price: 6.5,
    currency: 'EUR',
    category: 'Pantry',
    nutrition: null,
    nutriscore: 'C',
    nutriscore_svg: null,
    promotion_until_date: null,
    image_url: 'https://example.com/oil.jpg',
    last_enriched_at: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
}))

vi.mock('@/hooks/useMyList', () => ({
  useMyList: () => ({ addItem: mockAddItem }),
}))

// Stub the catalog search so selecting a product is a single click.
vi.mock('@/components/recipes/IngredientAutocomplete', () => ({
  IngredientAutocomplete: ({
    onSelect,
  }: {
    onSelect: (item: typeof sampleCatalogItem) => void
  }) => (
    <button type="button" onClick={() => onSelect(sampleCatalogItem)}>
      mock-select-extra
    </button>
  ),
}))

const weekStart = new Date('2024-01-01')
const weekEnd = new Date('2024-01-07')

const renderModal = (open = true, onOpenChange: (open: boolean) => void = vi.fn()) =>
  render(
    <MemoryRouter>
      <ShoppingListModal
        open={open}
        onOpenChange={onOpenChange}
        weekStart={weekStart}
        weekEnd={weekEnd}
      />
    </MemoryRouter>
  )

describe('ShoppingListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddItem.mockResolvedValue(undefined)
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

  describe('extras', () => {
    it('should render an Extras section with My List items', () => {
      mockData = createMockData()
      renderModal(true)
      expect(screen.getByText('Extras')).toBeInTheDocument()
      expect(screen.getByText('Toilet Paper')).toBeInTheDocument()
    })

    it('should still render the Extras section (with the search) when there are no extras', () => {
      mockData = { ...createMockData(), extras: [] }
      renderModal(true)
      expect(screen.getByText('Extras')).toBeInTheDocument()
      expect(screen.getByText('mock-select-extra')).toBeInTheDocument()
    })

    it('should render extras-only when there are no planned recipes', () => {
      mockData = { ...createMockData(), items_by_category: {} }
      renderModal(true)
      expect(screen.getByText('Extras')).toBeInTheDocument()
      expect(screen.getByText('Toilet Paper')).toBeInTheDocument()
      expect(screen.queryByText('Dairy')).not.toBeInTheDocument()
      expect(screen.queryByText(/Add some recipes first/)).not.toBeInTheDocument()
    })
  })

  describe('print', () => {
    it('should render a Print button when data is present', () => {
      mockData = createMockData()
      renderModal(true)
      expect(screen.getByRole('button', { name: /Print/ })).toBeInTheDocument()
    })

    it('should include extras inside the printable region', () => {
      mockData = createMockData()
      const { container } = renderModal(true)
      const printRegion = container.ownerDocument.querySelector('[data-print-region]')
      expect(printRegion).not.toBeNull()
      expect(printRegion).toHaveTextContent('Extras')
      expect(printRegion).toHaveTextContent('Toilet Paper')
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

  describe('inline add extra', () => {
    it('should render the inline catalog search in the Extras section', () => {
      mockData = createMockData()
      renderModal(true)
      expect(screen.getByText('mock-select-extra')).toBeInTheDocument()
    })

    it('should add the selected product to My List with the mapped fields', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      renderModal(true)

      await user.click(screen.getByText('mock-select-extra'))

      expect(mockAddItem).toHaveBeenCalledWith({
        id: 'cat-99',
        name: 'Olive Oil',
        brand: 'BrandX',
        price: 6.5,
        imageUrl: 'https://example.com/oil.jpg',
        nutriscore: 'C',
      })
    })

    it('should refresh the shopping list after adding, so the extra appears', async () => {
      const user = userEvent.setup()
      mockData = createMockData()
      // The regenerated list now carries the new extra (server-sourced).
      mockMutate.mockImplementation(() => {
        mockData = {
          ...createMockData(),
          extras: [
            ...createMockData().extras,
            {
              catalog_item_id: 'cat-99',
              catalog_item_name: 'Olive Oil',
              total_qty: 1,
              unit: 'pc',
              price: 6.5,
              line_total: 6.5,
              category: null,
              is_on_promotion: false,
              promotion_until_date: null,
              package_size: null,
              package_unit: null,
              packages_needed: null,
              last_enriched_at: null,
            },
          ],
        }
      })
      const { rerender } = renderModal(true)

      await user.click(screen.getByText('mock-select-extra'))

      // generate() is re-called only after the awaited add resolves.
      await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(2))

      rerender(
        <MemoryRouter>
          <ShoppingListModal open onOpenChange={vi.fn()} weekStart={weekStart} weekEnd={weekEnd} />
        </MemoryRouter>
      )
      expect(screen.getByText('Olive Oil')).toBeInTheDocument()
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
