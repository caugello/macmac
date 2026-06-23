import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

vi.mock('@/components/meal-plans/CopyWeekModal', () => ({
  CopyWeekModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="copy-week-modal">Copy Week Modal</div> : null,
}))

// Control the meal plan summary via the hook.
const useMealPlansMock = vi.fn()
vi.mock('@/hooks/useMealPlans', () => ({
  useMealPlans: (...args: unknown[]) => useMealPlansMock(...args),
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

beforeEach(() => {
  useMealPlansMock.mockReset()
  useMealPlansMock.mockReturnValue({ data: { data: [] }, isLoading: false, error: null })
})

describe('MealPlansPage', () => {
  describe('rendering', () => {
    it('should render page title and intro copy', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByRole('heading', { name: 'Plan Your Week' })).toBeInTheDocument()
      expect(screen.getByText(/Select a day to schedule or review your meals/i)).toBeInTheDocument()
    })

    it('should render WeeklyCalendar component', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('weekly-calendar')).toBeInTheDocument()
      expect(screen.getByText('Weekly Calendar')).toBeInTheDocument()
    })

    it('should render the Copy Week and Shopping List buttons', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /Copy Week/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Shopping List/ })).toBeInTheDocument()
    })

    it('should not render the modals initially', () => {
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.queryByTestId('shopping-list-modal')).not.toBeInTheDocument()
      expect(screen.queryByTestId('copy-week-modal')).not.toBeInTheDocument()
    })
  })

  describe('week summary', () => {
    it('shows a loading message while meals load', () => {
      useMealPlansMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/Loading meals/i)).toBeInTheDocument()
    })

    it('shows an error message when the week fails to load', () => {
      useMealPlansMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      })
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/Couldn't load this week/i)).toBeInTheDocument()
    })

    it('shows the empty state when no meals are planned', () => {
      useMealPlansMock.mockReturnValue({ data: { data: [] }, isLoading: false, error: null })
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/No meals planned yet/i)).toBeInTheDocument()
    })

    it('pluralizes the planned meal count', () => {
      useMealPlansMock.mockReturnValue({
        data: { data: [{ id: '1' }, { id: '2' }] },
        isLoading: false,
        error: null,
      })
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/2 meals planned/i)).toBeInTheDocument()
    })

    it('uses the singular form for a single planned meal', () => {
      useMealPlansMock.mockReturnValue({
        data: { data: [{ id: '1' }] },
        isLoading: false,
        error: null,
      })
      render(<MealPlansPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/1 meal planned/i)).toBeInTheDocument()
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

  describe('copy week modal', () => {
    it('should open the copy week modal when the Copy Week button is clicked', async () => {
      const user = userEvent.setup()
      render(<MealPlansPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /Copy Week/ }))

      expect(screen.getByTestId('copy-week-modal')).toBeInTheDocument()
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
