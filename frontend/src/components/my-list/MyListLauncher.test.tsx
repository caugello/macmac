import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { MyListLauncher } from './MyListLauncher'
import { MyListProvider, type MyListItem } from '@/hooks/useMyList'

const STORAGE_KEY = 'macmac:my-list'

const seed = (items: MyListItem[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items))

const renderLauncher = () =>
  render(
    <BrowserRouter>
      <MyListProvider>
        <MyListLauncher />
      </MyListProvider>
    </BrowserRouter>
  )

describe('MyListLauncher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a launcher button reflecting the empty count', () => {
    renderLauncher()
    expect(screen.getByRole('button', { name: /open my list, 0 items/i })).toBeInTheDocument()
  })

  it('shows a count badge when items are present', () => {
    seed([
      { id: 'a', name: 'A', brand: null, price: 1, imageUrl: null, nutriscore: null },
      { id: 'b', name: 'B', brand: null, price: 1, imageUrl: null, nutriscore: null },
    ])
    renderLauncher()
    expect(screen.getByRole('button', { name: /open my list, 2 items/i })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not render the sheet until the launcher is clicked', () => {
    renderLauncher()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /open my list/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
