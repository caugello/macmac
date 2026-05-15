import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { MealPlansPage } from './MealPlansPage'

// Mock the meal plan components
vi.mock('@/components/meal-plans/WeeklyCalendar', () => ({
  WeeklyCalendar: () => <div data-testid="weekly-calendar">Weekly Calendar</div>,
}))

vi.mock('@/components/meal-plans/ShoppingList', () => ({
  ShoppingList: ({ weekStart, weekEnd }: { weekStart: Date; weekEnd: Date }) => (
    <div data-testid="shopping-list">
      Shopping List: {weekStart.toISOString()} - {weekEnd.toISOString()}
    </div>
  ),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('MealPlansPage', () => {
  describe('rendering', () => {
    it('should render page title', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByText('Meal Calendar')).toBeInTheDocument()
    })

    it('should render WeeklyCalendar component', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('weekly-calendar')).toBeInTheDocument()
      expect(screen.getByText('Weekly Calendar')).toBeInTheDocument()
    })

    it('should render ShoppingList component', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('shopping-list')).toBeInTheDocument()
    })

    it('should pass week start and end dates to ShoppingList', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      const shoppingList = screen.getByTestId('shopping-list')
      expect(shoppingList).toBeInTheDocument()
      expect(shoppingList.textContent).toContain('Shopping List:')
    })
  })

  describe('layout', () => {
    it('should apply container styling', () => {
      const { container } = render(<MealPlansPage />, { wrapper: createWrapper() })
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('container')
      expect(mainDiv).toHaveClass('mx-auto')
    })

    it('should apply spacing between components', () => {
      const { container } = render(<MealPlansPage />, { wrapper: createWrapper() })
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('space-y-8')
    })
  })
})
