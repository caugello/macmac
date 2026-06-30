import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeeklyCalendar } from './WeeklyCalendar'
import { MealTypeEnum } from '@/lib/types'

const mockUseMealPlans = vi.fn()
const mockUseMediaQuery = vi.fn()

vi.mock('@/hooks/useMealPlans', () => ({
  useMealPlans: (...args: unknown[]) => mockUseMealPlans(...args),
}))

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (...args: unknown[]) => mockUseMediaQuery(...args),
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
    mockUseMealPlans.mockReturnValue({ data: { data: [] }, isLoading: false })
    mockUseMediaQuery.mockReturnValue(true) // desktop by default
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

  describe('view toggle', () => {
    it('should render Day and Week toggle buttons', () => {
      render(<WeeklyCalendar />)
      expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument()
    })

    it('should default to week view on desktop', () => {
      mockUseMediaQuery.mockReturnValue(true)
      render(<WeeklyCalendar />)
      expect(screen.getByText(/Jan 1 – Jan 7, 2024/)).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Sun')).toBeInTheDocument()
    })

    it('should default to day view on mobile', () => {
      mockUseMediaQuery.mockReturnValue(false)
      render(<WeeklyCalendar />)
      expect(screen.getByText(/Wednesday, Jan 3, 2024/)).toBeInTheDocument()
    })

    it('should switch from week to day view', () => {
      render(<WeeklyCalendar />)
      fireEvent.click(screen.getByRole('button', { name: 'Day' }))
      expect(screen.getByText(/Wednesday, Jan 3, 2024/)).toBeInTheDocument()
    })

    it('should switch from day to week view', () => {
      mockUseMediaQuery.mockReturnValue(false)
      render(<WeeklyCalendar />)
      fireEvent.click(screen.getByRole('button', { name: 'Week' }))
      expect(screen.getByText(/Jan 1 – Jan 7, 2024/)).toBeInTheDocument()
    })
  })

  describe('week view', () => {
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

    it('should render one meal type label per row', () => {
      render(<WeeklyCalendar />)
      expect(screen.getAllByText('breakfast')).toHaveLength(1)
      expect(screen.getAllByText('lunch')).toHaveLength(1)
      expect(screen.getAllByText('dinner')).toHaveLength(1)
    })

    it('should render MealSlot components for each day/meal combination', () => {
      render(<WeeklyCalendar />)
      expect(
        screen.getByTestId(`meal-slot-2024-01-01-${MealTypeEnum.BREAKFAST}`)
      ).toBeInTheDocument()
      expect(screen.getByTestId(`meal-slot-2024-01-01-${MealTypeEnum.LUNCH}`)).toBeInTheDocument()
      expect(screen.getByTestId(`meal-slot-2024-01-01-${MealTypeEnum.DINNER}`)).toBeInTheDocument()
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

  describe('day view', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false)
    })

    it('should show the current day with full date', () => {
      render(<WeeklyCalendar />)
      expect(screen.getByText(/Wednesday, Jan 3, 2024/)).toBeInTheDocument()
    })

    it('should render 3 meal slots for the selected day', () => {
      render(<WeeklyCalendar />)
      expect(
        screen.getByTestId(`meal-slot-2024-01-03-${MealTypeEnum.BREAKFAST}`)
      ).toBeInTheDocument()
      expect(screen.getByTestId(`meal-slot-2024-01-03-${MealTypeEnum.LUNCH}`)).toBeInTheDocument()
      expect(screen.getByTestId(`meal-slot-2024-01-03-${MealTypeEnum.DINNER}`)).toBeInTheDocument()
    })

    it('should navigate to next day', () => {
      render(<WeeklyCalendar />)
      fireEvent.click(screen.getByText('chevron_right').closest('button')!)
      expect(screen.getByText(/Thursday, Jan 4, 2024/)).toBeInTheDocument()
    })

    it('should navigate to previous day', () => {
      render(<WeeklyCalendar />)
      fireEvent.click(screen.getByText('chevron_left').closest('button')!)
      expect(screen.getByText(/Tuesday, Jan 2, 2024/)).toBeInTheDocument()
    })

    it('should wrap to previous week when navigating before Monday', () => {
      vi.setSystemTime(new Date('2024-01-01')) // Monday
      render(<WeeklyCalendar />)
      expect(screen.getByText(/Monday, Jan 1, 2024/)).toBeInTheDocument()
      fireEvent.click(screen.getByText('chevron_left').closest('button')!)
      expect(screen.getByText(/Sunday, Dec 31, 2023/)).toBeInTheDocument()
    })

    it('should wrap to next week when navigating past Sunday', () => {
      vi.setSystemTime(new Date('2024-01-07')) // Sunday
      render(<WeeklyCalendar />)
      expect(screen.getByText(/Sunday, Jan 7, 2024/)).toBeInTheDocument()
      fireEvent.click(screen.getByText('chevron_right').closest('button')!)
      expect(screen.getByText(/Monday, Jan 8, 2024/)).toBeInTheDocument()
    })

    it('should persist day view across week changes', () => {
      render(<WeeklyCalendar />)
      // Switch to day view
      fireEvent.click(screen.getByRole('button', { name: 'Day' }))
      // Navigate past Sunday to next week
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('chevron_right').closest('button')!)
      }
      // Should still be in day view, now showing Monday of next week
      expect(screen.getByText(/Monday, Jan 8, 2024/)).toBeInTheDocument()
    })
  })

  describe('today highlight', () => {
    it('should mark exactly one day header as today in week view', () => {
      const { container } = render(<WeeklyCalendar />)
      expect(container.querySelectorAll('[data-today]')).toHaveLength(1)
    })

    it('should not mark any header as today when today is outside the displayed week', () => {
      const { container } = render(<WeeklyCalendar />)
      fireEvent.click(screen.getByText('chevron_right').closest('button')!)
      expect(container.querySelectorAll('[data-today]')).toHaveLength(0)
    })

    it("should scroll today's card into view in week view", () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      render(<WeeklyCalendar />)
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    })

    it('should not scroll when today is the first day (Monday)', () => {
      vi.setSystemTime(new Date('2024-01-01'))
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const { container } = render(<WeeklyCalendar />)
      expect(container.querySelectorAll('[data-today]')).toHaveLength(1)
      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it('should show Today badge in day view when on current day', () => {
      mockUseMediaQuery.mockReturnValue(false)
      render(<WeeklyCalendar />)
      expect(screen.getByText('Today')).toBeInTheDocument()
    })
  })

  describe('meal plan data', () => {
    it('should call useMealPlans with correct date range', () => {
      render(<WeeklyCalendar />)
      expect(mockUseMealPlans).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      })
    })
  })
})
