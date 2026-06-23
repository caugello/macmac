import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
      expect(screen.getByText('Welcome back, Chris')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should render section headings while data loads', () => {
      mockUseRecipes.mockReturnValue({ data: undefined, isLoading: true, error: null })
      mockUseMealPlans.mockReturnValue({ data: undefined, isLoading: true, error: null })

      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('Recent recipes')).toBeInTheDocument()
      expect(screen.getByText("This week's plan")).toBeInTheDocument()
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
      expect(screen.getByText(/Couldn't load your meal plan/i)).toBeInTheDocument()
      expect(screen.getByText(/Couldn't load your recipes/i)).toBeInTheDocument()
    })
  })

  describe('populated state', () => {
    beforeEach(() => {
      mockUseRecipes.mockReturnValue({
        data: {
          total: 12,
          data: [
            { id: 'r1', title: 'Pasta Carbonara', category: 'main', ingredients: [{}, {}] },
            { id: 'r2', title: 'Pancakes', category: 'breakfast', ingredients: [{}] },
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
              date: '2026-06-22',
              meal_type: 'dinner',
              recipe_id: 'r1',
              recipe_title: 'Pasta Carbonara',
            },
            {
              id: 'm2',
              date: '2026-06-23',
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

    it('should render planned meal recipe titles', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      // Title appears both in the plan list and the recent recipes grid
      expect(screen.getAllByText('Pasta Carbonara').length).toBeGreaterThanOrEqual(1)
    })

    it('should render recent recipe cards linking to detail', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      const link = screen.getByRole('link', { name: /Pancakes/ })
      expect(link).toHaveAttribute('href', '/recipes/r2')
    })

    it('should render ingredient counts', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByText('1 ingredient')).toBeInTheDocument()
      expect(screen.getByText('2 ingredients')).toBeInTheDocument()
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
      expect(screen.getByRole('link', { name: /Browse catalog/i })).toHaveAttribute(
        'href',
        '/catalog'
      )
    })

    it('should link section headers to their pages', () => {
      render(<Dashboard />, { wrapper: createWrapper() })
      expect(screen.getByRole('link', { name: /View calendar/i })).toHaveAttribute(
        'href',
        '/meal-plans'
      )
      expect(screen.getByRole('link', { name: /View all/i })).toHaveAttribute('href', '/recipes')
    })
  })
})
