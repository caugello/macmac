import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryBadge } from './CategoryBadge'
import { RecipeCategoryEnum } from '@/lib/types'

describe('CategoryBadge', () => {
  it('should render the category label', () => {
    render(<CategoryBadge category={RecipeCategoryEnum.DESSERT} />)
    expect(screen.getByText('Dessert')).toBeInTheDocument()
  })

  it('should render "Uncategorized" for a null category', () => {
    render(<CategoryBadge category={null} />)
    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
  })

  it('should apply the category color class', () => {
    render(<CategoryBadge category={RecipeCategoryEnum.BREAKFAST} />)
    expect(screen.getByText('Breakfast')).toHaveClass('bg-amber-100')
  })

  it('should merge a custom className', () => {
    render(<CategoryBadge category={RecipeCategoryEnum.MAIN} className="absolute top-2" />)
    expect(screen.getByText('Main')).toHaveClass('absolute', 'top-2')
  })
})
