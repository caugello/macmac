import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { AppLayout } from './AppLayout'

// Mock Navbar component
vi.mock('./Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}))

// Mock MyListLauncher (depends on MyListProvider, not present in this test)
vi.mock('@/components/my-list/MyListLauncher', () => ({
  MyListLauncher: () => <div data-testid="my-list-launcher" />,
}))

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('AppLayout Component', () => {
  it('should render children', () => {
    renderWithRouter(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render Navbar', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    )
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('should wrap children in main element', () => {
    const { container } = renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    )
    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main).toHaveTextContent('Content')
  })

  it('should apply background styling', () => {
    const { container } = renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    )
    const wrapper = container.querySelector('.min-h-screen')
    expect(wrapper).toHaveClass('bg-background')
    expect(wrapper).toHaveClass('text-foreground')
  })

  it('should render multiple children', () => {
    renderWithRouter(
      <AppLayout>
        <div>First</div>
        <div>Second</div>
      </AppLayout>
    )
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })
})
