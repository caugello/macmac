import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { CatalogProductCard } from './CatalogProductCard'
import { MyListProvider } from '@/hooks/useMyList'
import type { CatalogItemOut } from '@/lib/types'

const item: CatalogItemOut = {
  id: 'prod-1',
  vendor_name: 'Colruyt',
  raw_name: 'Coca-Cola 1.5L',
  product_url: 'https://example.com/p',
  canonical_name: 'Coca-Cola 1.5L',
  normalized_name: 'coca cola',
  brand: 'Coca-Cola',
  net_quantity_value: 1.5,
  net_quantity_unit: null,
  is_food: true,
  price: 1.99,
  currency: 'EUR',
  category: 'Drinks',
  nutrition: null,
  nutriscore: 'e',
  nutriscore_svg: null,
  promotion_until_date: null,
  image_url: null,
  last_enriched_at: null,
  created_at: '',
  updated_at: '',
}

const renderCard = () =>
  render(
    <BrowserRouter>
      <MyListProvider>
        <CatalogProductCard item={item} />
      </MyListProvider>
    </BrowserRouter>
  )

describe('CatalogProductCard favorite toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the product', () => {
    renderCard()
    expect(screen.getByText('Coca-Cola 1.5L')).toBeInTheDocument()
  })

  it('starts not in the list', () => {
    renderCard()
    const button = screen.getByRole('button', { name: /add to my list/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('adds to My List when the heart is clicked', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /add to my list/i }))
    const button = screen.getByRole('button', { name: /remove from my list/i })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    const stored = JSON.parse(localStorage.getItem('macmac:my-list') ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('prod-1')
  })

  it('removes from My List when toggled again', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /add to my list/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove from my list/i }))
    expect(screen.getByRole('button', { name: /add to my list/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(JSON.parse(localStorage.getItem('macmac:my-list') ?? '[]')).toHaveLength(0)
  })
})
