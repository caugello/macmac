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
const mockUseRecipe = vi.fn()
const mockUseMealPlans = vi.fn()

vi.spyOn(useRecipesHook, 'useRecipes').mockImplementation(mockUseRecipes)
vi.spyOn(useRecipesHook, 'useRecipe').mockImplementation(mockUseRecipe)
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

// Today's ISO date, so meal-plan fixtures land in "today" buckets.
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

// The Dashboard matches the Pantry Fresh bento (screen 01):
// greeting -> Tonight hero + Your week + Smart suggestion -> stat tiles -> Coming up.
describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRecipe.mockReturnValue({ data: undefined, isLoading: false, error: null })
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
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null })
      mockUseMealPlans.mockReturnValue({ data: undefined, isLoading: true, error: null })
    })

    it('should not render the smart suggestion while data loads', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.queryByLabelText('Smart suggestion')).not.toBeInTheDocument()
    })

    it('should still greet the user while data loads', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText(/Good (morning|afternoon|evening), Chris/)).toBeInTheDocument()
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

    it('should prompt to plan when nothing is coming up', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText(/Nothing left to cook this week/i)).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    beforeEach(() => {
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
    })

    it('should show meal plan and recipe errors', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText(/Couldn't load your meal plan/i)).toBeInTheDocument()
      expect(screen.getByText(/Couldn't load your recipes/i)).toBeInTheDocument()
    })

    it('should not render the smart suggestion when data errors', () => {
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

    it("should feature tonight's dinner in the hero", () => {
      mockUseRecipe.mockReturnValue({
        data: {
          id: 'r1',
          title: 'Pasta Carbonara',
          servings: 4,
          ingredients: [{}, {}],
        },
        isLoading: false,
        error: null,
      })
      render(<Dashboard />, { wrapper: createWrapper() })
      const featured = screen.getByLabelText('Featured recipe')
      expect(featured).toHaveTextContent('Pasta Carbonara')
      expect(featured).toHaveTextContent(/Tonight/i)
    })

    it("should fall back to the newest recipe when tonight's dinner recipe is unavailable", () => {
      mockUseRecipe.mockReturnValue({ data: undefined, isLoading: false, error: null })
      render(<Dashboard />, { wrapper: createWrapper() })
      const featured = screen.getByLabelText('Featured recipe')
      expect(featured).toHaveTextContent('Pasta Carbonara')
    })

    it('should list upcoming meals in the coming-up tile', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('Coming up this week')).toBeInTheDocument()
      expect(screen.getByText('Pancakes')).toBeInTheDocument()
    })

    it('should show recipe and planned-meal stat counts', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('12')).toBeInTheDocument() // recipe library count
      expect(screen.getByText('Recipes')).toBeInTheDocument()
      expect(screen.getByText('This week')).toBeInTheDocument()
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

    it('should keep past meals out of the coming-up tile', () => {
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
      expect(screen.queryByText('Old Stew')).not.toBeInTheDocument()
    })
  })
})
