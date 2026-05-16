import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeeklyCalendar } from './WeeklyCalendar'
import { MealTypeEnum } from '@/lib/types'

const mockUseMealPlans = vi.fn()

vi.mock('@/hooks/useMealPlans', () => ({
  useMealPlans: (...args: unknown[]) => mockUseMealPlans(...args),
}))

vi.mock('./MealSlot', () => ({
  MealSlot: ({ date, mealType }: { date: string; mealType: string }) => (
    <div data-testid={`meal-slot-${date}-${mealType}`}>
      MealSlot {date} {mealType}
    </div>
  ),
}))

describe('WeeklyCalendar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-03'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('loading state', () => {
    it('should show loading skeleton while data is loading', () => {
      mockUseMealPlans.mockReturnValue({ data: null, isLoading: true })
      const { container } = render(<WeeklyCalendar />)
      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    beforeEach(() => {
      mockUseMealPlans.mockReturnValue({
        data: { data: [] },
        isLoading: false,
      })
    })

    it('should render week date range header', () => {
      render(<WeeklyCalendar />)
      expect(screen.getByText(/Jan 1 – Jan 7, 2024/)).toBeInTheDocument()
    })

    it('should render 7 day columns', () => {
      render(<WeeklyCalendar />)
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Tue')).toBeInTheDocument()
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
      expect(screen.getByText('Sun')).toBeInTheDocument()
    })

    it('should render meal type labels for each day', () => {
      render(<WeeklyCalendar />)
      const breakfastLabels = screen.getAllByText('breakfast')
      const lunchLabels = screen.getAllByText('lunch')
      const dinnerLabels = screen.getAllByText('dinner')
      expect(breakfastLabels).toHaveLength(7)
      expect(lunchLabels).toHaveLength(7)
      expect(dinnerLabels).toHaveLength(7)
    })

    it('should render MealSlot components for each day/meal combination', () => {
      render(<WeeklyCalendar />)
      expect(
        screen.getByTestId(`meal-slot-2024-01-01-${MealTypeEnum.BREAKFAST}`)
      ).toBeInTheDocument()
      expect(screen.getByTestId(`meal-slot-2024-01-01-${MealTypeEnum.LUNCH}`)).toBeInTheDocument()
      expect(screen.getByTestId(`meal-slot-2024-01-01-${MealTypeEnum.DINNER}`)).toBeInTheDocument()
    })

    it('should render navigation buttons', () => {
      render(<WeeklyCalendar />)
      expect(screen.getByText('chevron_left')).toBeInTheDocument()
      expect(screen.getByText('chevron_right')).toBeInTheDocument()
    })
  })

  describe('week navigation', () => {
    beforeEach(() => {
      mockUseMealPlans.mockReturnValue({
        data: { data: [] },
        isLoading: false,
      })
    })

    it('should navigate to previous week', () => {
      render(<WeeklyCalendar />)

      fireEvent.click(screen.getByText('chevron_left').closest('button')!)

      expect(screen.getByText(/Dec 25 – Dec 31, 2023/)).toBeInTheDocument()
    })

    it('should navigate to next week', () => {
      render(<WeeklyCalendar />)

      fireEvent.click(screen.getByText('chevron_right').closest('button')!)

      expect(screen.getByText(/Jan 8 – Jan 14, 2024/)).toBeInTheDocument()
    })
  })

  describe('meal plan data', () => {
    it('should call useMealPlans with correct date range', () => {
      mockUseMealPlans.mockReturnValue({
        data: { data: [] },
        isLoading: false,
      })
      render(<WeeklyCalendar />)

      expect(mockUseMealPlans).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      })
    })
  })
})
