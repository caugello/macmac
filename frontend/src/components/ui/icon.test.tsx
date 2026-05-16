import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon } from './icon'

describe('Icon Component', () => {
  describe('rendering', () => {
    it('should render the icon name as text content', () => {
      render(<Icon name="restaurant_menu" />)
      expect(screen.getByText('restaurant_menu')).toBeInTheDocument()
    })

    it('should apply material-symbols-outlined class', () => {
      render(<Icon name="home" />)
      const icon = screen.getByText('home')
      expect(icon).toHaveClass('material-symbols-outlined')
    })

    it('should render as a span element', () => {
      render(<Icon name="search" />)
      const icon = screen.getByText('search')
      expect(icon.tagName).toBe('SPAN')
    })
  })

  describe('size', () => {
    it('should default to size 24', () => {
      render(<Icon name="home" />)
      const icon = screen.getByText('home')
      expect(icon.style.fontSize).toBe('24px')
    })

    it('should accept custom size', () => {
      render(<Icon name="home" size={48} />)
      const icon = screen.getByText('home')
      expect(icon.style.fontSize).toBe('48px')
    })
  })

  describe('filled', () => {
    it('should not set fill variation when filled is false', () => {
      render(<Icon name="home" />)
      const icon = screen.getByText('home')
      expect(icon.style.fontVariationSettings).toBe('')
    })

    it('should set fill variation when filled is true', () => {
      render(<Icon name="home" filled />)
      const icon = screen.getByText('home')
      expect(icon.style.fontVariationSettings).toContain("'FILL' 1")
    })
  })

  describe('className', () => {
    it('should merge custom className', () => {
      render(<Icon name="home" className="text-primary" />)
      const icon = screen.getByText('home')
      expect(icon).toHaveClass('material-symbols-outlined')
      expect(icon).toHaveClass('text-primary')
    })
  })
})
