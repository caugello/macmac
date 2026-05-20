import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CatalogList } from './CatalogList'
import * as useCatalogHook from '@/hooks/useCatalog'

const mockUseCatalog = vi.fn()
const mockUseCatalogCategories = vi.fn()

vi.spyOn(useCatalogHook, 'useCatalog').mockImplementation(mockUseCatalog)
vi.spyOn(useCatalogHook, 'useCatalogCategories').mockImplementation(mockUseCatalogCategories)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

const mockCategories = {
  data: { categories: ['Beverages', 'Bread & Bakery', 'Dairy & Eggs', 'Meat & Poultry'] },
  isLoading: false,
  error: null,
}

describe('CatalogList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCatalogCategories.mockReturnValue(mockCategories)
  })

  describe('loading state', () => {
    it('should show loading message', () => {
      mockUseCatalog.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('Loading catalog...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error message', () => {
      mockUseCatalog.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText(/Error loading catalog/i)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show no products message', () => {
      mockUseCatalog.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    })
  })

  describe('with products', () => {
    const mockProducts = {
      data: [
        {
          id: '1',
          canonical_name: 'Organic Milk',
          raw_name: 'Organic Whole Milk 1L',
          brand: 'FreshDairy',
          category: 'Dairy & Eggs',
          is_food: true,
          vendor_name: 'SuperMarket',
          net_quantity_value: 1,
          net_quantity_unit: 'L',
          price: 2.99,
          nutriscore: 'A',
        },
        {
          id: '2',
          canonical_name: 'Whole Wheat Bread',
          raw_name: 'Whole Wheat Bread 500g',
          brand: null,
          category: 'Bread & Bakery',
          is_food: true,
          vendor_name: 'Local Bakery',
          net_quantity_value: null,
          net_quantity_unit: null,
          price: null,
          nutriscore: null,
        },
      ],
      total: 2,
    }

    beforeEach(() => {
      mockUseCatalog.mockReturnValue({
        data: mockProducts,
        isLoading: false,
        error: null,
      })
    })

    it('should render page title', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('Product Catalog')).toBeInTheDocument()
    })

    it('should render search bar', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument()
    })

    it('should render product cards', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('Organic Milk')).toBeInTheDocument()
      expect(screen.getByText('Whole Wheat Bread')).toBeInTheDocument()
    })

    it('should render brand when available', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('FreshDairy')).toBeInTheDocument()
    })

    it('should render price in euro format', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      const priceElements = screen.getAllByText((_, el) => {
        if (!el || el.children.length > 0) return false
        return el.textContent?.includes('2.99') ?? false
      })
      expect(priceElements.length).toBeGreaterThan(0)
    })

    it('should render nutri-score badge', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('should link to product detail pages', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      const link1 = screen.getByText('Organic Milk').closest('a')
      const link2 = screen.getByText('Whole Wheat Bread').closest('a')
      expect(link1).toHaveAttribute('href', '/catalog/1')
      expect(link2).toHaveAttribute('href', '/catalog/2')
    })

    it('should use raw_name when canonical_name is missing', () => {
      mockUseCatalog.mockReturnValue({
        data: {
          data: [
            {
              id: '1',
              canonical_name: null,
              raw_name: 'Raw Product Name',
              is_food: true,
              vendor_name: 'Vendor',
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('Raw Product Name')).toBeInTheDocument()
    })

    it('should not render pagination when total is less than limit', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should render pagination when total exceeds limit', () => {
      mockUseCatalog.mockReturnValue({
        data: {
          data: Array(20).fill({ id: '1', canonical_name: 'Product', vendor_name: 'Vendor' }),
          total: 50,
        },
        isLoading: false,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('category filters', () => {
    beforeEach(() => {
      mockUseCatalog.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })
    })

    it('should render category pills from the API', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('All Products')).toBeInTheDocument()
      expect(screen.getByText('Dairy & Eggs')).toBeInTheDocument()
      expect(screen.getByText('Meat & Poultry')).toBeInTheDocument()
      expect(screen.getByText('Beverages')).toBeInTheDocument()
      expect(screen.getByText('Bread & Bakery')).toBeInTheDocument()
    })

    it('should not render category pills when categories are not yet loaded', () => {
      mockUseCatalogCategories.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.queryByText('All Products')).not.toBeInTheDocument()
    })

    it('should pass category to useCatalog when a category is selected', async () => {
      const user = userEvent.setup()
      render(<CatalogList />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Dairy & Eggs'))

      await waitFor(() => {
        expect(mockUseCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'Dairy & Eggs' })
        )
      })
    })

    it('should not pass category when All Products is selected', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(mockUseCatalog).toHaveBeenCalledWith(expect.objectContaining({ category: undefined }))
    })

    it('should reset page to 0 when category changes', async () => {
      const user = userEvent.setup()
      render(<CatalogList />, { wrapper: createWrapper() })

      await user.click(screen.getByText('Beverages'))

      await waitFor(() => {
        expect(mockUseCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ offset: 0, category: 'Beverages' })
        )
      })
    })
  })

  describe('search functionality', () => {
    it('should call useCatalog with search term', async () => {
      const user = userEvent.setup()
      mockUseCatalog.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })

      const searchInput = screen.getByPlaceholderText('Search products...')
      await user.type(searchInput, 'milk')

      await waitFor(
        () => {
          expect(mockUseCatalog).toHaveBeenCalledWith(expect.objectContaining({ search: 'milk' }))
        },
        { timeout: 1000 }
      )
    })
  })

  describe('pagination', () => {
    it('should call useCatalog with correct offset when page changes', async () => {
      const user = userEvent.setup()
      mockUseCatalog.mockReturnValue({
        data: {
          data: Array(20).fill({ id: '1', canonical_name: 'Product', vendor_name: 'Vendor' }),
          total: 50,
        },
        isLoading: false,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })

      const page2Button = screen.getByText('2')
      await user.click(page2Button)

      await waitFor(() => {
        expect(mockUseCatalog).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 }))
      })
    })
  })
})
