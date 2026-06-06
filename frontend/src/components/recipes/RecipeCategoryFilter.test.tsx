import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeCategoryFilter } from './RecipeCategoryFilter'
import { RecipeCategoryEnum } from '@/lib/types'

describe('RecipeCategoryFilter', () => {
  const onToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render a chip for every category', () => {
    render(<RecipeCategoryFilter selected={[]} onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: /Breakfast/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Main/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dessert/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Beverage/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Other/ })).toBeInTheDocument()
  })

  it('should mark selected categories as pressed', () => {
    render(<RecipeCategoryFilter selected={[RecipeCategoryEnum.DESSERT]} onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: /Dessert/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Main/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('should call onToggle with the category when a chip is clicked', async () => {
    const user = userEvent.setup()
    render(<RecipeCategoryFilter selected={[]} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: /Snack/ }))
    expect(onToggle).toHaveBeenCalledWith(RecipeCategoryEnum.SNACK)
  })

  it('should render counts when provided', () => {
    render(
      <RecipeCategoryFilter
        selected={[]}
        onToggle={onToggle}
        counts={{ [RecipeCategoryEnum.MAIN]: 7 }}
      />
    )
    expect(screen.getByRole('button', { name: /Main 7/ })).toBeInTheDocument()
  })
})
