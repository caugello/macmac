import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterChips } from './FilterChips'

const items = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Meat']

describe('FilterChips Component', () => {
  describe('rendering', () => {
    it('should render all chip buttons', () => {
      render(<FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />)

      for (const item of items) {
        expect(screen.getByRole('button', { name: item })).toBeInTheDocument()
      }
    })

    it('should highlight the active chip', () => {
      render(<FilterChips items={items} activeItem="Fruits" onItemChange={vi.fn()} />)

      const activeButton = screen.getByRole('button', { name: 'Fruits' })
      expect(activeButton.className).toContain('bg-primary')
      expect(activeButton.className).toContain('text-on-primary')
    })

    it('should style inactive chips differently', () => {
      render(<FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />)

      const inactiveButton = screen.getByRole('button', { name: 'Fruits' })
      expect(inactiveButton.className).toContain('bg-surface-container-low')
      expect(inactiveButton.className).not.toContain('bg-primary')
    })

    it('should apply custom className to wrapper', () => {
      const { container } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} className="mt-3" />
      )

      expect(container.firstChild).toHaveClass('mt-3')
    })

    it('should render nothing meaningful with empty items', () => {
      const { container } = render(<FilterChips items={[]} activeItem="" onItemChange={vi.fn()} />)

      expect(screen.queryAllByRole('button')).toHaveLength(0)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render a single item', () => {
      render(<FilterChips items={['All']} activeItem="All" onItemChange={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.queryAllByRole('button')).toHaveLength(1)
    })
  })

  describe('user interaction', () => {
    it('should call onItemChange when clicking a chip', async () => {
      const user = userEvent.setup()
      const onItemChange = vi.fn()

      render(<FilterChips items={items} activeItem="All" onItemChange={onItemChange} />)

      await user.click(screen.getByRole('button', { name: 'Dairy' }))

      expect(onItemChange).toHaveBeenCalledWith('Dairy')
      expect(onItemChange).toHaveBeenCalledTimes(1)
    })

    it('should call onItemChange when clicking the already-active chip', async () => {
      const user = userEvent.setup()
      const onItemChange = vi.fn()

      render(<FilterChips items={items} activeItem="All" onItemChange={onItemChange} />)

      await user.click(screen.getByRole('button', { name: 'All' }))

      expect(onItemChange).toHaveBeenCalledWith('All')
    })
  })

  describe('overflow and expand/collapse', () => {
    function mockOverflow(container: HTMLElement, overflowing: boolean) {
      const chipContainer = container.firstChild!.firstChild as HTMLElement
      Object.defineProperty(chipContainer, 'scrollHeight', {
        configurable: true,
        value: overflowing ? 200 : 80,
      })
      Object.defineProperty(chipContainer, 'clientHeight', {
        configurable: true,
        value: 80,
      })
    }

    function rerenderWithNewRef(
      rerender: (ui: React.ReactElement) => void,
      overrideItems?: string[]
    ) {
      rerender(
        <FilterChips
          items={[...(overrideItems ?? items)]}
          activeItem="All"
          onItemChange={vi.fn()}
        />
      )
    }

    it('should not show toggle when content fits', () => {
      const { container, rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      mockOverflow(container, false)
      rerenderWithNewRef(rerender)

      expect(screen.queryByRole('button', { name: /show all/i })).not.toBeInTheDocument()
    })

    it('should show "Show all" toggle when content overflows', () => {
      const { container, rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      mockOverflow(container, true)
      rerenderWithNewRef(rerender)

      expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument()
    })

    it('should display total item count in toggle', () => {
      const { container, rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      mockOverflow(container, true)
      rerenderWithNewRef(rerender)

      expect(screen.getByRole('button', { name: /show all \(5\)/i })).toBeInTheDocument()
    })

    it('should expand and show "Show less" when toggle is clicked', async () => {
      const user = userEvent.setup()
      const { container, rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      mockOverflow(container, true)
      rerenderWithNewRef(rerender)

      await user.click(screen.getByRole('button', { name: /show all/i }))

      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /show all/i })).not.toBeInTheDocument()
    })

    it('should collapse back when "Show less" is clicked', async () => {
      const user = userEvent.setup()
      const { container, rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      mockOverflow(container, true)
      rerenderWithNewRef(rerender)

      await user.click(screen.getByRole('button', { name: /show all/i }))
      await user.click(screen.getByRole('button', { name: /show less/i }))

      expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument()
    })

    it('should apply overflow-hidden class when collapsed', () => {
      const { container } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      const chipContainer = container.firstChild!.firstChild as HTMLElement
      expect(chipContainer.className).toContain('overflow-hidden')
    })

    it('should remove overflow-hidden class when expanded', async () => {
      const user = userEvent.setup()
      const { container, rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      mockOverflow(container, true)
      rerenderWithNewRef(rerender)

      await user.click(screen.getByRole('button', { name: /show all/i }))

      const chipContainer = container.firstChild!.firstChild as HTMLElement
      expect(chipContainer.className).not.toContain('overflow-hidden')
    })
  })

  describe('active styling updates', () => {
    it('should update active styling when activeItem prop changes', () => {
      const { rerender } = render(
        <FilterChips items={items} activeItem="All" onItemChange={vi.fn()} />
      )

      expect(screen.getByRole('button', { name: 'All' }).className).toContain('bg-primary')
      expect(screen.getByRole('button', { name: 'Dairy' }).className).not.toContain('bg-primary')

      rerender(<FilterChips items={items} activeItem="Dairy" onItemChange={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'Dairy' }).className).toContain('bg-primary')
      expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-primary')
    })
  })
})
