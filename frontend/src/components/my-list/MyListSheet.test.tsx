import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MyListSheet } from './MyListSheet'
import { MyListProvider, type MyListItem } from '@/hooks/useMyList'

const STORAGE_KEY = 'macmac:my-list'

const itemA: MyListItem = {
  id: 'a',
  name: 'Coca-Cola 1.5L',
  brand: 'Coca-Cola',
  price: 1.99,
  imageUrl: null,
  nutriscore: 'e',
}
const itemB: MyListItem = {
  id: 'b',
  name: 'Oranges 1kg',
  brand: null,
  price: 2.5,
  imageUrl: null,
  nutriscore: 'a',
}

const seed = (items: MyListItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const renderSheet = (props: { open: boolean; onClose?: () => void }) =>
  render(
    <BrowserRouter>
      <MyListProvider>
        <MyListSheet open={props.open} onClose={props.onClose ?? vi.fn()} />
      </MyListProvider>
    </BrowserRouter>
  )

describe('MyListSheet', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders nothing when closed', () => {
    renderSheet({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the empty state when there are no items', () => {
    renderSheet({ open: true })
    expect(screen.getByText('Your list is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse the catalog/i })).toBeInTheDocument()
  })

  it('renders items with name, brand and price', () => {
    seed([itemA, itemB])
    renderSheet({ open: true })
    expect(screen.getByText('Coca-Cola 1.5L')).toBeInTheDocument()
    expect(screen.getByText('Oranges 1kg')).toBeInTheDocument()
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument()
  })

  it('shows the item count in the header', () => {
    seed([itemA, itemB])
    renderSheet({ open: true })
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })

  it('computes the estimated total', () => {
    seed([itemA, itemB])
    renderSheet({ open: true })
    // 1.99 + 2.50 = 4.49 (rendered with a non-breaking space before the euro sign)
    expect(screen.getByText(/4\.49/)).toBeInTheDocument()
  })

  it('removes an item when its remove button is clicked', () => {
    seed([itemA, itemB])
    renderSheet({ open: true })
    fireEvent.click(screen.getByRole('button', { name: /remove coca-cola 1\.5l/i }))
    expect(screen.queryByText('Coca-Cola 1.5L')).not.toBeInTheDocument()
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('clears all items via the Clear all button', () => {
    seed([itemA, itemB])
    renderSheet({ open: true })
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByText('Your list is empty')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    seed([itemA])
    renderSheet({ open: true, onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    renderSheet({ open: true, onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
