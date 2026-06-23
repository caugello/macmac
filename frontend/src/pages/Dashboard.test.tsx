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
    it('should render section headings while data loads', () => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null })
      mockUseMealPlans.mockReturnValue({ data: undefined, isLoading: true, error: null })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('Recent recipes')).toBeInTheDocument()
      expect(screen.getByText("This week's plan")).toBeInTheDocument()
      expect(screen.getByText('Featured recipe')).toBeInTheDocument()
      expect(screen.getByText("Today's trajectory")).toBeInTheDocument()
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

    it('should show empty meal plan state with CTA', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('No meals planned yet')).toBeInTheDocument()
      // "Plan meals" appears as both the empty-state CTA and a quick action.
      expect(screen.getAllByText('Plan meals').length).toBeGreaterThanOrEqual(1)
    })

    it('should show empty recipes state with CTA', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('No recipes yet')).toBeInTheDocument()
      // "Add recipe" appears as both the empty-state CTA and a quick action.
      expect(screen.getAllByText('Add recipe').length).toBeGreaterThanOrEqual(1)
    })

    it('should show zero stats', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('Recipes')).toBeInTheDocument()
      expect(screen.getByText('Meals this week')).toBeInTheDocument()
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
            {
              id: 'r2',
              title: 'Pancakes',
              description: null,
              servings: null,
              category: 'breakfast',
              ingredients: [{}],
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

    it('should render recipe stat total', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('should render planned meals count', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should feature the newest recipe with real metadata', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const featured = screen.getByLabelText('Featured recipe')
      expect(featured).toHaveTextContent('Pasta Carbonara')
      expect(featured).toHaveTextContent('4 servings')
      expect(featured).toHaveTextContent('2 ingredients')
    })

    it('should render planned meal recipe titles', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      // Title appears in featured card, plan list, trajectory and recipes grid.
      expect(screen.getAllByText('Pasta Carbonara').length).toBeGreaterThanOrEqual(1)
    })

    it('should place today meals into the trajectory timeline', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const trajectory = screen.getByLabelText("Today's trajectory")
      expect(trajectory).toHaveTextContent('Pancakes')
      expect(trajectory).toHaveTextContent('Pasta Carbonara')
    })

    it('should render recent recipe cards linking to detail', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const links = screen.getAllByRole('link', { name: /Pancakes/ })
      expect(links.some((l) => l.getAttribute('href') === '/recipes/r2')).toBe(true)
    })

    it('should render ingredient counts in the recipes grid', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('1 ingredient')).toBeInTheDocument()
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

  describe('quick actions', () => {
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

    it('should link quick actions to the correct routes', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByRole('link', { name: /Plan meals.*weekly calendar/i })).toHaveAttribute(
        'href',
        '/meal-plans'
      )
      expect(screen.getByRole('link', { name: /Add recipe.*collection/i })).toHaveAttribute(
        'href',
        '/recipes/new'
      )
      // "Browse catalog" appears in both the smart suggestion and the quick actions.
      const catalogLinks = screen.getAllByRole('link', { name: /Browse catalog/i })
      expect(catalogLinks.some((l) => l.getAttribute('href') === '/catalog')).toBe(true)
    })

    it('should link section headers to their pages', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getAllByRole('link', { name: /View calendar/i })[0]).toHaveAttribute(
        'href',
        '/meal-plans'
      )
      expect(screen.getAllByRole('link', { name: /View all/i })[0]).toHaveAttribute(
        'href',
        '/recipes'
      )
    })
  })
})
