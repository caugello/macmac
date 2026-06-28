import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Fab } from './fab'

describe('Fab', () => {
  it('renders the icon and is a button', () => {
    render(<Fab icon="add" aria-label="Create" />)
    const button = screen.getByRole('button', { name: 'Create' })
    expect(button).toBeInTheDocument()
    expect(screen.getByText('add')).toBeInTheDocument()
  })

  it('calls onClick when pressed', () => {
    const onClick = vi.fn()
    render(<Fab icon="add" aria-label="Create" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows a count badge when count > 0', () => {
    render(<Fab icon="shopping_cart" aria-label="My list" count={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides the count badge when count is 0', () => {
    render(<Fab icon="shopping_cart" aria-label="My list" count={0} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('caps the count badge at 99+', () => {
    render(<Fab icon="shopping_cart" aria-label="My list" count={150} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('applies the accent tone', () => {
    render(<Fab icon="add" aria-label="Create" tone="accent" />)
    expect(screen.getByRole('button', { name: 'Create' }).className).toContain('bg-lime')
  })
})
