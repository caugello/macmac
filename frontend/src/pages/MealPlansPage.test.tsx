import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { MealPlansPage } from './MealPlansPage'

// Mock the meal plan components
vi.mock('@/components/meal-plans/WeeklyCalendar', () => ({
  WeeklyCalendar: () => <div data-testid="weekly-calendar">Weekly Calendar</div>,
}))

vi.mock('@/components/meal-plans/ShoppingListModal', () => ({
  ShoppingListModal: ({
    open,
    weekStart,
    weekEnd,
  }: {
    open: boolean
    weekStart: Date
    weekEnd: Date
  }) =>
    open ? (
      <div data-testid="shopping-list-modal">
        Shopping List: {weekStart.toISOString()} - {weekEnd.toISOString()}
      </div>
    ) : null,
}))

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

    it('should render the Shopping List button', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /Shopping List/ })).toBeInTheDocument()
    })

    it('should not render the shopping list modal initially', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.queryByTestId('shopping-list-modal')).not.toBeInTheDocument()
    })
  })

  describe('shopping list modal', () => {
    it('should open the modal when the Shopping List button is clicked', async () => {
      const user = userEvent.setup()
      render(<MealPlansPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /Shopping List/ }))

      expect(screen.getByTestId('shopping-list-modal')).toBeInTheDocument()
    })

    it('should pass week start and end dates to the modal', async () => {
      const user = userEvent.setup()
      render(<MealPlansPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /Shopping List/ }))

      expect(screen.getByTestId('shopping-list-modal').textContent).toContain('Shopping List:')
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
      expect(mainDiv).toHaveClass('space-y-6')
    })
  })
})
