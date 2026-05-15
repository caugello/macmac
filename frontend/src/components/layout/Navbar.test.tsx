import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navbar } from './Navbar'

const mockLogout = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const renderWithRouter = (component: React.ReactElement, route = '/') => {
  window.history.pushState({}, '', route)
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when not authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
      })
    })

    it('should render MacMac logo', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('MacMac')).toBeInTheDocument()
      expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('should render unauthenticated navigation links', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('Features')).toBeInTheDocument()
      expect(screen.getByText('How It Works')).toBeInTheDocument()
    })

    it('should render Sign In button', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should not render authenticated navigation links', () => {
      renderWithRouter(<Navbar />)
      expect(screen.queryByText('Recipes')).not.toBeInTheDocument()
      expect(screen.queryByText('Meal Plans')).not.toBeInTheDocument()
      expect(screen.queryByText('Catalog')).not.toBeInTheDocument()
      expect(screen.queryByText('Groups')).not.toBeInTheDocument()
    })

    it('should not render logout button', () => {
      renderWithRouter(<Navbar />)
      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    })
  })

  describe('when authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { username: 'testuser', id: '1' },
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
      })
    })

    it('should render MacMac logo', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('MacMac')).toBeInTheDocument()
    })

    it('should render authenticated navigation links', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('Recipes')).toBeInTheDocument()
      expect(screen.getByText('Meal Plans')).toBeInTheDocument()
      expect(screen.getByText('Catalog')).toBeInTheDocument()
      expect(screen.getByText('Groups')).toBeInTheDocument()
    })

    it('should display username', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('should render logout button', () => {
      renderWithRouter(<Navbar />)
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should call logout when logout button is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter(<Navbar />)

      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    it('should not render unauthenticated links', () => {
      renderWithRouter(<Navbar />)
      expect(screen.queryByText('Features')).not.toBeInTheDocument()
      expect(screen.queryByText('How It Works')).not.toBeInTheDocument()
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    })
  })

  describe('on login page', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
      })
    })

    it('should not render navbar', () => {
      renderWithRouter(<Navbar />, '/login')
      expect(screen.queryByText('MacMac')).not.toBeInTheDocument()
    })
  })

  describe('logo link', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { username: 'testuser', id: '1' },
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
      })
    })

    it('should link to home page', () => {
      renderWithRouter(<Navbar />)
      const logoLink = screen.getByText('MacMac').closest('a')
      expect(logoLink).toHaveAttribute('href', '/')
    })
  })

  describe('navigation links', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { username: 'testuser', id: '1' },
        logout: mockLogout,
        login: vi.fn(),
        isLoading: false,
      })
    })

    it('should have correct href for Recipes', () => {
      renderWithRouter(<Navbar />)
      const recipesLink = screen.getByText('Recipes').closest('a')
      expect(recipesLink).toHaveAttribute('href', '/recipes')
    })

    it('should have correct href for Meal Plans', () => {
      renderWithRouter(<Navbar />)
      const mealPlansLink = screen.getByText('Meal Plans').closest('a')
      expect(mealPlansLink).toHaveAttribute('href', '/meal-plans')
    })

    it('should have correct href for Catalog', () => {
      renderWithRouter(<Navbar />)
      const catalogLink = screen.getByText('Catalog').closest('a')
      expect(catalogLink).toHaveAttribute('href', '/catalog')
    })

    it('should have correct href for Groups', () => {
      renderWithRouter(<Navbar />)
      const groupsLink = screen.getByText('Groups').closest('a')
      expect(groupsLink).toHaveAttribute('href', '/groups')
    })
  })
})
