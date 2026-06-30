import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CatalogList } from './CatalogList'
import * as useCatalogHook from '@/hooks/useCatalog'
import { MyListProvider } from '@/hooks/useMyList'

const mockUseCatalog = vi.fn()
const mockUseCatalogDepartments = vi.fn()

vi.spyOn(useCatalogHook, 'useCatalog').mockImplementation(mockUseCatalog)
vi.spyOn(useCatalogHook, 'useCatalogDepartments').mockImplementation(mockUseCatalogDepartments)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MyListProvider>{children}</MyListProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

const mockDepartments = {
  data: {
    departments: [
      {
        name: 'Produce',
        icon: 'eco',
        count: 7,
        categories: [
          { name: 'Leafy Greens', count: 5 },
          { name: 'Vegetables', count: 2 },
        ],
      },
      {
        name: 'Dairy & Eggs',
        icon: 'egg',
        count: 3,
        categories: [
          { name: 'Milk & Cream', count: 3 },
          { name: 'Cheese', count: 0 },
        ],
      },
    ],
  },
  isLoading: false,
  error: null,
}

describe('CatalogList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUseCatalogDepartments.mockReturnValue(mockDepartments)
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
          category: 'Milk & Cream',
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
          category: 'Bread',
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
      expect(screen.getByRole('heading', { name: 'Shop' })).toBeInTheDocument()
    })

    it('should show the result count', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByText('Showing 2 items')).toBeInTheDocument()
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

    it('should render a favorite button that does not navigate', async () => {
      const user = userEvent.setup()
      render(<CatalogList />, { wrapper: createWrapper() })

      const favButtons = screen.getAllByRole('button', { name: 'Add to My List' })
      expect(favButtons.length).toBe(2)

      await user.click(favButtons[0])
      expect(window.location.pathname).toBe('/')
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
      expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
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
      expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument()
    })
  })

  describe('department navigation', () => {
    beforeEach(() => {
      mockUseCatalog.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })
    })

    it('should render the department rail with names and counts', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      const nav = screen.getByRole('navigation', { name: 'Departments' })
      expect(within(nav).getByText('Produce')).toBeInTheDocument()
      expect(within(nav).getByText('Dairy & Eggs')).toBeInTheDocument()
    })

    it('should expand the first department by default and show its categories', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      // Produce is first → expanded, its categories visible.
      expect(screen.getByText('Leafy Greens')).toBeInTheDocument()
      expect(screen.getByText('Vegetables')).toBeInTheDocument()
      // Dairy is collapsed → its categories not shown.
      expect(screen.queryByText('Milk & Cream')).not.toBeInTheDocument()
    })

    it('should not render the rail when departments are not yet loaded', () => {
      mockUseCatalogDepartments.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.queryByRole('navigation', { name: 'Departments' })).not.toBeInTheDocument()
    })

    it('should expand a department on toggle and collapse the previous one', async () => {
      const user = userEvent.setup()
      render(<CatalogList />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { expanded: false, name: /Dairy & Eggs/ }))

      await waitFor(() => {
        expect(screen.getByText('Milk & Cream')).toBeInTheDocument()
      })
      // Produce's categories are hidden now.
      expect(screen.queryByText('Leafy Greens')).not.toBeInTheDocument()
    })

    it('should pass the selected category to useCatalog', async () => {
      const user = userEvent.setup()
      render(<CatalogList />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /Leafy Greens/ }))

      await waitFor(() => {
        expect(mockUseCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'Leafy Greens', offset: 0 })
        )
      })
    })

    it('should show the active category and breadcrumb', async () => {
      const user = userEvent.setup()
      render(<CatalogList />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /Leafy Greens/ }))

      // Section header reflects the active category.
      expect(screen.getByRole('heading', { name: 'Leafy Greens' })).toBeInTheDocument()
      // Breadcrumb: Shop > Produce > Leafy Greens.
      const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(within(crumb).getByText('Shop')).toBeInTheDocument()
      expect(within(crumb).getByText('Produce')).toBeInTheDocument()
      expect(within(crumb).getByText('Leafy Greens')).toBeInTheDocument()
    })

    it('should default the section header to All Products', () => {
      render(<CatalogList />, { wrapper: createWrapper() })
      expect(screen.getByRole('heading', { name: 'All Products' })).toBeInTheDocument()
      expect(mockUseCatalog).toHaveBeenCalledWith(expect.objectContaining({ category: undefined }))
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

      const page2Button = screen.getByRole('button', { name: 'Go to page 2' })
      await user.click(page2Button)

      await waitFor(() => {
        expect(mockUseCatalog).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 }))
      })
    })
  })
})
