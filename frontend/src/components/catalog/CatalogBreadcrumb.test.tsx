import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CatalogBreadcrumb } from './CatalogBreadcrumb'

describe('CatalogBreadcrumb', () => {
  it('renders only Shop when no category is selected', () => {
    render(<CatalogBreadcrumb department={null} category={null} />)
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumb).getByText('Shop')).toBeInTheDocument()
    expect(within(crumb).queryByText('Produce')).not.toBeInTheDocument()
  })

  it('renders Shop > Department > Category', () => {
    render(<CatalogBreadcrumb department="Produce" category="Leafy Greens" />)
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumb).getByText('Shop')).toBeInTheDocument()
    expect(within(crumb).getByText('Produce')).toBeInTheDocument()
    expect(within(crumb).getByText('Leafy Greens')).toBeInTheDocument()
  })
})
