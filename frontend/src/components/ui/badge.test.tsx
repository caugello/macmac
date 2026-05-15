import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './badge'

describe('Badge Component', () => {
  describe('rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Test Badge</Badge>)
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('should render with children', () => {
      render(
        <Badge>
          <span>Custom Content</span>
        </Badge>
      )
      expect(screen.getByText('Custom Content')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<Badge>Default</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-primary')
    })

    it('should apply secondary variant', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-secondary')
    })

    it('should apply destructive variant', () => {
      const { container } = render(<Badge variant="destructive">Destructive</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-destructive')
    })

    it('should apply outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      const { container } = render(<Badge className="custom-class">Badge</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('custom-class')
      expect(badge).toHaveClass('inline-flex')
    })
  })

  describe('HTML attributes', () => {
    it('should accept data attributes', () => {
      const { container } = render(<Badge data-testid="badge">Badge</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('data-testid', 'badge')
    })

    it('should accept aria attributes', () => {
      const { container } = render(<Badge aria-label="test badge">Badge</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('aria-label', 'test badge')
    })
  })
})
