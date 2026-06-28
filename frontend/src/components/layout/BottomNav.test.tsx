import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from './BottomNav'

const renderWithRouter = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>
  )

describe('BottomNav Component', () => {
  describe('rendering', () => {
    it('should render all navigation items', () => {
      renderWithRouter()
      expect(screen.getByText('Recipes')).toBeInTheDocument()
      expect(screen.getByText('Meal Plans')).toBeInTheDocument()
      expect(screen.getByText('Catalog')).toBeInTheDocument()
    })

    it('should render as a nav element', () => {
      renderWithRouter()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should render links with correct hrefs', () => {
      renderWithRouter()
      expect(screen.getByText('Recipes').closest('a')).toHaveAttribute('href', '/recipes')
      expect(screen.getByText('Meal Plans').closest('a')).toHaveAttribute('href', '/meal-plans')
      expect(screen.getByText('Catalog').closest('a')).toHaveAttribute('href', '/catalog')
    })

    it('should render icon names for each nav item', () => {
      renderWithRouter()
      expect(screen.getByText('restaurant_menu')).toBeInTheDocument()
      expect(screen.getByText('calendar_month')).toBeInTheDocument()
      expect(screen.getByText('menu_book')).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('should highlight recipes link when on /recipes', () => {
      renderWithRouter('/recipes')
      const link = screen.getByText('Recipes').closest('a')!
      expect(link.className).toContain('text-ink')
    })

    it('should highlight meal plans link when on /meal-plans', () => {
      renderWithRouter('/meal-plans')
      const link = screen.getByText('Meal Plans').closest('a')!
      expect(link.className).toContain('text-ink')
    })

    it('should highlight catalog link when on /catalog', () => {
      renderWithRouter('/catalog')
      const link = screen.getByText('Catalog').closest('a')!
      expect(link.className).toContain('text-ink')
    })

    it('should highlight based on path prefix', () => {
      renderWithRouter('/recipes/123')
      const link = screen.getByText('Recipes').closest('a')!
      expect(link.className).toContain('text-ink')
    })

    it('should not highlight inactive links', () => {
      renderWithRouter('/recipes')
      const catalogLink = screen.getByText('Catalog').closest('a')!
      expect(catalogLink.className).toContain('text-on-surface-variant')
    })
  })
})
