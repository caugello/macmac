import { render, screen } from '@testing-library/react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CatalogDetail } from './CatalogDetail'
import * as useCatalogHook from '@/hooks/useCatalog'

const mockUseCatalogItem = vi.fn()

vi.spyOn(useCatalogHook, 'useCatalogItem').mockImplementation(mockUseCatalogItem)

const createWrapper = (initialRoute = '/catalog/1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  window.history.pushState({}, '', initialRoute)
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/catalog/:id" element={children} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

describe('CatalogDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should show loading message', () => {
      mockUseCatalogItem.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Loading product...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error message when product not found', () => {
      mockUseCatalogItem.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Product not found.')).toBeInTheDocument()
      expect(screen.getByText('Back to Catalog')).toBeInTheDocument()
    })

    it('should show error message when item is null', () => {
      mockUseCatalogItem.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Product not found.')).toBeInTheDocument()
    })
  })

  describe('with product data', () => {
    const mockProduct = {
      id: '1',
      canonical_name: 'Organic Milk',
      raw_name: 'Organic Whole Milk 1L',
      normalized_name: 'organic milk',
      brand: 'FreshDairy',
      category: 'Dairy & Eggs',
      is_food: true,
      vendor_name: 'SuperMarket',
      net_quantity_value: 1,
      net_quantity_unit: 'L',
      price: 2.99,
      product_url: 'https://example.com/product',
      nutriscore: 'A',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }

    beforeEach(() => {
      mockUseCatalogItem.mockReturnValue({
        data: mockProduct,
        isLoading: false,
        error: null,
      })
    })

    it('should render product name', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Organic Milk')).toBeInTheDocument()
    })

    it('should use raw_name when canonical_name is missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, canonical_name: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Organic Whole Milk 1L')).toBeInTheDocument()
    })

    it('should render vendor name', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getAllByText(/SuperMarket/).length).toBeGreaterThan(0)
    })

    it('should render price with euro symbol', () => {
      const { container } = render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(container.textContent).toContain('2.99')
      expect(container.textContent).toContain('€')
    })

    it('should not render price when price is missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, price: null },
        isLoading: false,
        error: null,
      })

      const { container } = render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(container.textContent).not.toContain('€')
    })

    it('should render brand', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('FreshDairy')).toBeInTheDocument()
    })

    it('should not render brand when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, brand: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('FreshDairy')).not.toBeInTheDocument()
    })

    it('should render nutri-score badge with label', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('Nutri-Score')).toBeInTheDocument()
    })

    it('should not render nutri-score when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, nutriscore: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Nutri-Score')).not.toBeInTheDocument()
    })

    it('should render category in product details', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Dairy & Eggs')).toBeInTheDocument()
    })

    it('should render food type in product details', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Food')).toBeInTheDocument()
    })

    it('should render Non-Food for non-food items', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, is_food: false },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Non-Food')).toBeInTheDocument()
    })

    it('should render weight in product details', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Weight')).toBeInTheDocument()
      expect(screen.getByText('1 L')).toBeInTheDocument()
    })

    it('should not render weight when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, net_quantity_value: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Weight')).not.toBeInTheDocument()
    })

    it('should render product URL link', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      const link = screen.getByText('View on Vendor Site').closest('a')
      expect(link).toHaveAttribute('href', 'https://example.com/product')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render back button', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      const backLink = screen.getByText('Back to Catalog').closest('a')
      expect(backLink).toHaveAttribute('href', '/catalog')
    })

    it('should render Product Details section', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Product Details')).toBeInTheDocument()
    })

    it('should show raw name in details when it differs from canonical', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Raw Name')).toBeInTheDocument()
      expect(screen.getByText('Organic Whole Milk 1L')).toBeInTheDocument()
    })

    it('should not show raw name row when canonical equals raw', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, canonical_name: 'Organic Whole Milk 1L' },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Raw Name')).not.toBeInTheDocument()
    })
  })

  describe('freshness badge', () => {
    const baseProduct = {
      id: '1',
      canonical_name: 'Test Product',
      raw_name: 'Test Product Raw',
      vendor_name: 'Vendor',
      is_food: true,
      product_url: 'https://example.com/product',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }

    it('should show "Updated today" for recently enriched items', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...baseProduct, last_enriched_at: new Date().toISOString() },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Updated today')).toBeInTheDocument()
    })

    it('should show stale badge for items enriched 7+ days ago', () => {
      const staleDate = new Date(Date.now() - 10 * 86_400_000).toISOString()
      mockUseCatalogItem.mockReturnValue({
        data: { ...baseProduct, last_enriched_at: staleDate },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Updated 10 days ago')).toBeInTheDocument()
    })

    it('should not show freshness badge when last_enriched_at is null', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...baseProduct, last_enriched_at: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText(/Updated/)).not.toBeInTheDocument()
    })
  })

  describe('with nutrition information', () => {
    const mockProductWithNutrition = {
      id: '1',
      canonical_name: 'Yogurt',
      raw_name: 'Greek Yogurt',
      vendor_name: 'HealthyFoods',
      is_food: true,
      product_url: 'https://example.com/yogurt',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      nutrition: {
        energy_kcal: 100,
        protein_g: 10,
        carbs_g: 5,
        sugars_g: 3,
        fat_g: 2,
        saturated_fat_g: 1,
        fiber_g: 0,
        salt_g: 0.1,
        serving_size: '100g',
      },
    }

    beforeEach(() => {
      mockUseCatalogItem.mockReturnValue({
        data: mockProductWithNutrition,
        isLoading: false,
        error: null,
      })
    })

    it('should render nutrition section', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Nutritional Values (100g)')).toBeInTheDocument()
    })

    it('should render energy value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText(/100kcal/)).toBeInTheDocument()
    })

    it('should render fat value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Fat')).toBeInTheDocument()
      expect(screen.getByText(/2g/)).toBeInTheDocument()
    })

    it('should render carbs value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Carbs')).toBeInTheDocument()
      expect(screen.getByText(/5g/)).toBeInTheDocument()
    })

    it('should render protein value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Protein')).toBeInTheDocument()
      expect(screen.getByText(/10g/)).toBeInTheDocument()
    })

    it('should render serving size', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText(/Serving size: 100g/)).toBeInTheDocument()
    })

    it('should not render nutrition section when nutrition is missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProductWithNutrition, nutrition: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Nutritional Values (100g)')).not.toBeInTheDocument()
    })

    it('should not render serving size when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: {
          ...mockProductWithNutrition,
          nutrition: { ...mockProductWithNutrition.nutrition, serving_size: null },
        },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText(/Serving size:/)).not.toBeInTheDocument()
    })
  })
})
