import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { format } from 'date-fns'
import { Dashboard } from './Dashboard'
import * as useRecipesHook from '@/hooks/useRecipes'
import * as useMealPlansHook from '@/hooks/useMealPlans'
import * as AuthContext from '@/contexts/AuthContext'

const mockUseRecipes = vi.fn()
const mockUseMealPlans = vi.fn()

vi.spyOn(useRecipesHook, 'useRecipes').mockImplementation(mockUseRecipes)
vi.spyOn(useMealPlansHook, 'useMealPlans').mockImplementation(mockUseMealPlans)
vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
  user: {
    id: 'u1',
    username: 'Chris',
    email: 'chris@example.com',
    groups: [],
    pending_invitations: 0,
  },
  token: 'tok',
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
})

// Today's ISO date, so meal-plan fixtures land in "Today's trajectory".
const TODAY = format(new Date(), 'yyyy-MM-dd')

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

// The Dashboard matches the Stitch "Dashboard - Ivory Flux" composition:
// greeting -> smart suggestion -> featured recipe -> today's trajectory.
describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('greeting', () => {
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })
      mockUseMealPlans.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })
    })

    it('should greet the user by username', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByRole('heading', { name: /Chris/, level: 1 })).toBeInTheDocument()
    })

    it('should show a time-of-day greeting', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText(/Good (morning|afternoon|evening), Chris/)).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should render the Stitch section headings while data loads', () => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null })
      mockUseMealPlans.mockReturnValue({ data: undefined, isLoading: true, error: null })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('Featured recipe')).toBeInTheDocument()
      expect(screen.getByText("Today's trajectory")).toBeInTheDocument()
    })

    it('should not render sections absent from the Stitch design', () => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null })
      mockUseMealPlans.mockReturnValue({ data: undefined, isLoading: true, error: null })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.queryByText('Recent recipes')).not.toBeInTheDocument()
      expect(screen.queryByText("This week's plan")).not.toBeInTheDocument()
      expect(screen.queryByText('Quick actions')).not.toBeInTheDocument()
    })

    it('should not render the smart suggestion while data loads', () => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null })
      mockUseMealPlans.mockReturnValue({ data: undefined, isLoading: true, error: null })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.queryByLabelText('Smart suggestion')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })
      mockUseMealPlans.mockReturnValue({
        data: { data: [], total: 0 },
        isLoading: false,
        error: null,
      })
    })

    it('should suggest adding a first recipe when there are none', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const suggestion = screen.getByLabelText('Smart suggestion')
      expect(suggestion).toHaveTextContent('Add your first recipe')
    })

    it('should show empty trajectory slots for each meal', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const trajectory = screen.getByLabelText("Today's trajectory")
      expect(trajectory).toHaveTextContent('Breakfast')
      expect(trajectory).toHaveTextContent('Lunch')
      expect(trajectory).toHaveTextContent('Dinner')
    })
  })

  describe('error state', () => {
    it('should show meal plan and recipe errors', () => {
      mockUseRecipes.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      })
      mockUseMealPlans.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getAllByText(/Couldn't load your meal plan/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Couldn't load your recipes/i).length).toBeGreaterThanOrEqual(1)
    })

    it('should not render the smart suggestion when data errors', () => {
      mockUseRecipes.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      })
      mockUseMealPlans.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.queryByLabelText('Smart suggestion')).not.toBeInTheDocument()
    })
  })

  describe('populated state', () => {
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({
        data: {
          total: 12,
          data: [
            {
              id: 'r1',
              title: 'Pasta Carbonara',
              description: 'Creamy Roman classic',
              servings: 4,
              category: 'main',
              ingredients: [{}, {}],
            },
          ],
        },
        isLoading: false,
        error: null,
      })
      mockUseMealPlans.mockReturnValue({
        data: {
          total: 2,
          data: [
            {
              id: 'm1',
              date: TODAY,
              meal_type: 'dinner',
              recipe_id: 'r1',
              recipe_title: 'Pasta Carbonara',
            },
            {
              id: 'm2',
              date: TODAY,
              meal_type: 'breakfast',
              recipe_id: 'r2',
              recipe_title: 'Pancakes',
            },
          ],
        },
        isLoading: false,
        error: null,
      })
    })

    it('should feature the newest recipe with real metadata', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const featured = screen.getByLabelText('Featured recipe')
      expect(featured).toHaveTextContent('Pasta Carbonara')
      expect(featured).toHaveTextContent('4 servings')
      expect(featured).toHaveTextContent('2 ingredients')
    })

    it('should place today meals into the trajectory timeline', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const trajectory = screen.getByLabelText("Today's trajectory")
      expect(trajectory).toHaveTextContent('Pancakes')
      expect(trajectory).toHaveTextContent('Pasta Carbonara')
    })

    it('should suggest a shopping list when meals are planned', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const suggestion = screen.getByLabelText('Smart suggestion')
      expect(suggestion).toHaveTextContent('Turn your plan into a shopping list')
    })
  })

  describe('today vs other days', () => {
    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should keep non-today meals out of the trajectory', () => {
      mockUseRecipes.mockReturnValue({
        data: { data: [], total: 5 },
        isLoading: false,
        error: null,
      })
      mockUseMealPlans.mockReturnValue({
        data: {
          total: 1,
          data: [
            {
              id: 'm1',
              date: '2020-01-01',
              meal_type: 'dinner',
              recipe_id: 'r1',
              recipe_title: 'Old Stew',
            },
          ],
        },
        isLoading: false,
        error: null,
      })

      render(<Dashboard />, { wrapper: createWrapper() })
      const trajectory = screen.getByLabelText("Today's trajectory")
      expect(trajectory).not.toHaveTextContent('Old Stew')
    })
  })
})
