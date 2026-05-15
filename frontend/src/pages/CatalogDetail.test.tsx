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
      category: 'Dairy',
      is_food: true,
      vendor_name: 'SuperMarket',
      net_quantity_value: 1,
      net_quantity_unit: 'L',
      price: 2.99,
      product_url: 'https://example.com/product',
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
      // Should appear in heading and details section
      expect(screen.getAllByText('Organic Milk').length).toBeGreaterThan(0)
    })

    it('should use raw_name when canonical_name is missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, canonical_name: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getAllByText('Organic Whole Milk 1L').length).toBeGreaterThan(0)
    })

    it('should render vendor name', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('SuperMarket')).toBeInTheDocument()
    })

    it('should render price', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('€2.99')).toBeInTheDocument()
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

    it('should render food badge', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Food')).toBeInTheDocument()
    })

    it('should render non-food badge for non-food items', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, is_food: false },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Non-Food')).toBeInTheDocument()
    })

    it('should render brand badge', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('FreshDairy')).toBeInTheDocument()
    })

    it('should not render brand badge when brand is missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, brand: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('FreshDairy')).not.toBeInTheDocument()
    })

    it('should render category badge', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Dairy')).toBeInTheDocument()
    })

    it('should render raw name in details', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Raw Name')).toBeInTheDocument()
      expect(screen.getAllByText('Organic Whole Milk 1L').length).toBeGreaterThan(0)
    })

    it('should render canonical name in details', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Canonical Name')).toBeInTheDocument()
      expect(screen.getAllByText('Organic Milk').length).toBeGreaterThan(0)
    })

    it('should not render canonical name section when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, canonical_name: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Canonical Name')).not.toBeInTheDocument()
    })

    it('should render normalized name', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Normalized Name')).toBeInTheDocument()
      expect(screen.getByText('organic milk')).toBeInTheDocument()
    })

    it('should not render normalized name section when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, normalized_name: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Normalized Name')).not.toBeInTheDocument()
    })

    it('should render quantity', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Quantity')).toBeInTheDocument()
      expect(screen.getByText('1 L')).toBeInTheDocument()
    })

    it('should not render quantity section when missing', () => {
      mockUseCatalogItem.mockReturnValue({
        data: { ...mockProduct, net_quantity_value: null },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.queryByText('Quantity')).not.toBeInTheDocument()
    })

    it('should render product URL link', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      const link = screen.getByText('View on Vendor Site').closest('a')
      expect(link).toHaveAttribute('href', 'https://example.com/product')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render creation date', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText(/Added:/)).toBeInTheDocument()
    })

    it('should render update date', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })

    it('should render back button', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      const backButton = screen.getByText('Back to Catalog').closest('a')
      expect(backButton).toHaveAttribute('href', '/catalog')
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
      expect(screen.getByText('Nutritional Information (per 100g)')).toBeInTheDocument()
    })

    it('should render energy value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('100 kcal')).toBeInTheDocument()
    })

    it('should render protein value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Protein')).toBeInTheDocument()
      expect(screen.getByText('10g')).toBeInTheDocument()
    })

    it('should render carbs value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Carbohydrates')).toBeInTheDocument()
      expect(screen.getByText('5g')).toBeInTheDocument()
    })

    it('should render sugars value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Sugars')).toBeInTheDocument()
      expect(screen.getByText('3g')).toBeInTheDocument()
    })

    it('should render fat value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Fat')).toBeInTheDocument()
      expect(screen.getByText('2g')).toBeInTheDocument()
    })

    it('should render saturated fat value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Saturated Fat')).toBeInTheDocument()
      expect(screen.getByText('1g')).toBeInTheDocument()
    })

    it('should not render fiber when value is 0 (falsy)', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      // fiber_g is 0, which is falsy, so it won't render
      expect(screen.queryByText('Fiber')).not.toBeInTheDocument()
    })

    it('should render fiber value when not zero', () => {
      mockUseCatalogItem.mockReturnValue({
        data: {
          ...mockProductWithNutrition,
          nutrition: { ...mockProductWithNutrition.nutrition, fiber_g: 7 },
        },
        isLoading: false,
        error: null,
      })

      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Fiber')).toBeInTheDocument()
      expect(screen.getByText('7g')).toBeInTheDocument()
    })

    it('should render salt value', () => {
      render(<CatalogDetail />, { wrapper: createWrapper() })
      expect(screen.getByText('Salt')).toBeInTheDocument()
      expect(screen.getByText('0.1g')).toBeInTheDocument()
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
      expect(screen.queryByText('Nutritional Information (per 100g)')).not.toBeInTheDocument()
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
