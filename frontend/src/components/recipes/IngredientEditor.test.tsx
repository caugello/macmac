import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IngredientEditor } from './IngredientEditor'
import { UnitEnum, type CatalogItemOut, type IngredientCreate } from '@/lib/types'

const mockCatalogData = {
  data: [
    {
      id: 'cat-1',
      vendor_name: 'Vendor',
      raw_name: 'Whole Milk 1L',
      product_url: 'https://example.com',
      canonical_name: 'Whole Milk',
      normalized_name: null,
      brand: 'FarmFresh',
      net_quantity_value: 1000,
      net_quantity_unit: UnitEnum.MILLILITER,
      is_food: true,
      price: 1.49,
      currency: 'EUR',
      category: 'Dairy',
      nutrition: null,
      nutriscore: null,
      nutriscore_svg: null,
      promotion_until_date: null,
      created_at: '',
      updated_at: '',
    },
  ] as CatalogItemOut[],
  total: 1,
  limit: 10,
  offset: 0,
}

vi.mock('@/hooks/useCatalog', () => ({
  useCatalog: () => ({ data: mockCatalogData }),
}))

describe('IngredientEditor Component', () => {
  const onChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('should show empty message when no ingredients', () => {
      render(<IngredientEditor ingredients={[]} onChange={onChange} />)
      expect(screen.getByText(/No ingredients added yet/)).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<IngredientEditor ingredients={[]} onChange={onChange} />)
      expect(screen.getByPlaceholderText('Search catalog to add ingredient...')).toBeInTheDocument()
    })

    it('should render add ingredient button', () => {
      render(<IngredientEditor ingredients={[]} onChange={onChange} />)
      expect(screen.getByText('Add Ingredient')).toBeInTheDocument()
    })
  })

  describe('with ingredients', () => {
    const existingIngredients: (IngredientCreate & { _catalog_item?: CatalogItemOut })[] = [
      {
        catalog_item_id: 'cat-1',
        qty: 500,
        unit: UnitEnum.GRAM,
        _catalog_item: {
          id: 'cat-1',
          canonical_name: 'Flour',
          raw_name: 'All Purpose Flour',
          brand: 'BakeBest',
        } as CatalogItemOut,
      },
    ]

    it('should render ingredient name', () => {
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)
      expect(screen.getByText('Flour')).toBeInTheDocument()
    })

    it('should render ingredient brand', () => {
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)
      expect(screen.getByText('BakeBest')).toBeInTheDocument()
    })

    it('should render quantity input with value', () => {
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)
      const qtyInput = screen.getByDisplayValue('500')
      expect(qtyInput).toBeInTheDocument()
    })

    it('should render unit selector with correct value', () => {
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)
      const select = screen.getByDisplayValue(UnitEnum.GRAM)
      expect(select).toBeInTheDocument()
    })

    it('should call onChange when quantity is updated', async () => {
      const user = userEvent.setup()
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)

      const qtyInput = screen.getByDisplayValue('500')
      await user.clear(qtyInput)
      await user.type(qtyInput, '250')

      expect(onChange).toHaveBeenCalled()
    })

    it('should call onChange when unit is changed', async () => {
      const user = userEvent.setup()
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)

      const select = screen.getByDisplayValue(UnitEnum.GRAM)
      await user.selectOptions(select, UnitEnum.KILOGRAM)

      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ unit: UnitEnum.KILOGRAM })])
    })

    it('should call onChange without the ingredient when remove is clicked', async () => {
      const user = userEvent.setup()
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)

      const removeButton = screen.getByText('close').closest('button')!
      await user.click(removeButton)

      expect(onChange).toHaveBeenCalledWith([])
    })

    it('should not show empty message', () => {
      render(<IngredientEditor ingredients={existingIngredients} onChange={onChange} />)
      expect(screen.queryByText(/No ingredients added yet/)).not.toBeInTheDocument()
    })
  })

  describe('search and add', () => {
    it('should show catalog results when typing in search', async () => {
      const user = userEvent.setup()
      render(<IngredientEditor ingredients={[]} onChange={onChange} />)

      const searchInput = screen.getByPlaceholderText('Search catalog to add ingredient...')
      await user.type(searchInput, 'milk')

      expect(screen.getByText('Whole Milk')).toBeInTheDocument()
      expect(screen.getByText(/FarmFresh/)).toBeInTheDocument()
    })
  })
})
