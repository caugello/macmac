import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CatalogDepartmentNav } from './CatalogDepartmentNav'
import type { CatalogDepartment } from '@/lib/types'

const departments: CatalogDepartment[] = [
  {
    name: 'Produce',
    icon: 'eco',
    count: 7,
    categories: [
      { name: 'Leafy Greens', count: 5 },
      { name: 'Vegetables', count: 2 },
    ],
  },
  {
    name: 'Dairy & Eggs',
    icon: 'egg',
    count: 3,
    categories: [
      { name: 'Milk & Cream', count: 3 },
      { name: 'Cheese', count: 0 },
    ],
  },
]

const renderNav = (overrides: Partial<React.ComponentProps<typeof CatalogDepartmentNav>> = {}) => {
  const onToggleDepartment = vi.fn()
  const onSelectCategory = vi.fn()
  render(
    <CatalogDepartmentNav
      departments={departments}
      activeCategory={null}
      expandedDepartment="Produce"
      onToggleDepartment={onToggleDepartment}
      onSelectCategory={onSelectCategory}
      {...overrides}
    />
  )
  return { onToggleDepartment, onSelectCategory }
}

describe('CatalogDepartmentNav', () => {
  it('renders all departments with their counts', () => {
    renderNav()
    const nav = screen.getByRole('navigation', { name: 'Departments' })
    expect(within(nav).getByText('Produce')).toBeInTheDocument()
    expect(within(nav).getByText('Dairy & Eggs')).toBeInTheDocument()
    expect(within(nav).getByText('7')).toBeInTheDocument()
    expect(within(nav).getByText('3')).toBeInTheDocument()
  })

  it('shows categories only for the expanded department', () => {
    renderNav({ expandedDepartment: 'Produce' })
    expect(screen.getByText('Leafy Greens')).toBeInTheDocument()
    expect(screen.getByText('Vegetables')).toBeInTheDocument()
    expect(screen.queryByText('Milk & Cream')).not.toBeInTheDocument()
  })

  it('sets aria-expanded on the active department toggle', () => {
    renderNav({ expandedDepartment: 'Produce' })
    expect(screen.getByRole('button', { name: /Produce/, expanded: true })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Dairy & Eggs/, expanded: false })
    ).toBeInTheDocument()
  })

  it('calls onToggleDepartment when a department header is clicked', async () => {
    const user = userEvent.setup()
    const { onToggleDepartment } = renderNav()

    await user.click(screen.getByRole('button', { name: /Dairy & Eggs/ }))
    expect(onToggleDepartment).toHaveBeenCalledWith('Dairy & Eggs')
  })

  it('calls onSelectCategory when a category is clicked', async () => {
    const user = userEvent.setup()
    const { onSelectCategory } = renderNav()

    await user.click(screen.getByRole('button', { name: /Leafy Greens/ }))
    expect(onSelectCategory).toHaveBeenCalledWith('Leafy Greens')
  })

  it('marks the active category with aria-current', () => {
    renderNav({ activeCategory: 'Leafy Greens', expandedDepartment: 'Produce' })
    const active = screen.getByRole('button', { name: /Leafy Greens/, current: true })
    expect(active).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vegetables/, current: false })).toBeInTheDocument()
  })

  it('renders per-category counts including zero', () => {
    renderNav({ expandedDepartment: 'Dairy & Eggs' })
    const cheese = screen.getByRole('button', { name: /Cheese/ })
    expect(within(cheese).getByText('0')).toBeInTheDocument()
  })
})
