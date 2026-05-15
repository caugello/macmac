import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination Component', () => {
  describe('rendering', () => {
    it('should not render when totalPages <= 1', () => {
      const onPageChange = vi.fn()
      const { container } = render(
        <Pagination total={5} limit={10} page={0} onPageChange={onPageChange} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when totalPages > 1', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      // Should have prev button, page buttons, next button
      expect(screen.getAllByRole('button').length).toBeGreaterThan(2)
    })

    it('should render previous and next buttons', () => {
      const onPageChange = vi.fn()
      const { container } = render(
        <Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />
      )

      // Check for ChevronLeft and ChevronRight icons (SVGs)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(2)
    })

    it('should render page numbers', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      // Should have page 1 (page 0 in 0-indexed)
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    })

    it('should highlight current page', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={50} limit={10} page={2} onPageChange={onPageChange} />)

      const currentPageButton = screen.getByRole('button', { name: '3' })
      expect(currentPageButton.className).toContain('bg-[#00CEB8]')
    })
  })

  describe('page calculation', () => {
    it('should calculate totalPages correctly', () => {
      const onPageChange = vi.fn()

      // 50 items, 10 per page = 5 pages
      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
    })

    it('should round up partial pages', () => {
      const onPageChange = vi.fn()

      // 55 items, 10 per page = 6 pages (55/10 = 5.5, rounded up)
      render(<Pagination total={55} limit={10} page={0} onPageChange={onPageChange} />)

      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
    })
  })

  describe('ellipsis rendering', () => {
    it('should show ellipsis for many pages', () => {
      const onPageChange = vi.fn()

      // 100 items, 10 per page = 10 pages
      render(<Pagination total={100} limit={10} page={0} onPageChange={onPageChange} />)

      expect(screen.getByText('...')).toBeInTheDocument()
    })

    it('should show pages around current page', () => {
      const onPageChange = vi.fn()

      // Total 100 items = 10 pages, current page = 5 (0-indexed)
      render(<Pagination total={100} limit={10} page={5} onPageChange={onPageChange} />)

      // Should show pages 5, 6, 7 (0-indexed = 6, 7, 8 in UI)
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument()
    })

    it('should always show first and last page', () => {
      const onPageChange = vi.fn()

      render(<Pagination total={100} limit={10} page={5} onPageChange={onPageChange} />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('should call onPageChange when clicking a page number', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      // Click on page 2 (which is visible on first page)
      const page2Button = screen.getByRole('button', { name: '2' })
      await user.click(page2Button)

      expect(onPageChange).toHaveBeenCalledWith(1) // 0-indexed
    })

    it('should call onPageChange when clicking next button', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1] // Last button is next

      await user.click(nextButton)

      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('should call onPageChange when clicking previous button', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={2} onPageChange={onPageChange} />)

      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0] // First button is previous

      await user.click(prevButton)

      expect(onPageChange).toHaveBeenCalledWith(1)
    })
  })

  describe('button states', () => {
    it('should disable previous button on first page', () => {
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]

      expect(prevButton).toBeDisabled()
    })

    it('should enable previous button when not on first page', () => {
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={2} onPageChange={onPageChange} />)

      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]

      expect(prevButton).not.toBeDisabled()
    })

    it('should disable next button on last page', () => {
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={4} onPageChange={onPageChange} />)

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]

      expect(nextButton).toBeDisabled()
    })

    it('should enable next button when not on last page', () => {
      const onPageChange = vi.fn()

      render(<Pagination total={50} limit={10} page={0} onPageChange={onPageChange} />)

      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[buttons.length - 1]

      expect(nextButton).not.toBeDisabled()
    })
  })

  describe('edge cases', () => {
    it('should handle total = 0', () => {
      const onPageChange = vi.fn()
      const { container } = render(
        <Pagination total={0} limit={10} page={0} onPageChange={onPageChange} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle single item', () => {
      const onPageChange = vi.fn()
      const { container } = render(
        <Pagination total={1} limit={10} page={0} onPageChange={onPageChange} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle exactly limit items (1 page)', () => {
      const onPageChange = vi.fn()
      const { container } = render(
        <Pagination total={10} limit={10} page={0} onPageChange={onPageChange} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle limit + 1 items (2 pages)', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={11} limit={10} page={0} onPageChange={onPageChange} />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    })

    it('should handle very large totals', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={10000} limit={10} page={0} onPageChange={onPageChange} />)

      // Should show ellipsis
      expect(screen.getByText('...')).toBeInTheDocument()
      // Should show first and last page
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '1000' })).toBeInTheDocument()
    })
  })

  describe('page display logic', () => {
    it('should show visible pages based on current page', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={40} limit={10} page={0} onPageChange={onPageChange} />)

      // 40/10 = 4 pages
      // On page 0, shows: page 1 (0), page 2 (1), ..., page 4 (3)
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
    })

    it('should condense pages with ellipsis when total pages > 5', () => {
      const onPageChange = vi.fn()
      render(<Pagination total={100} limit={10} page={0} onPageChange={onPageChange} />)

      // Should not show all 10 pages
      expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '6' })).not.toBeInTheDocument()

      // Should show ellipsis
      expect(screen.getByText('...')).toBeInTheDocument()
    })
  })
})
