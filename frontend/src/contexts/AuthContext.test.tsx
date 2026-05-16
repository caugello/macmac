import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}))

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, _cb) => vi.fn()),
}))

// Mock the auth API
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Test component that uses useAuth
const TestComponent = () => {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth()

  return (
    <div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="isLoading">{isLoading ? 'true' : 'false'}</div>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockNavigate.mockClear()
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within AuthProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('AuthProvider initialization', () => {
    it('should initialize with no user when localStorage is empty', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('token').textContent).toBe('null')
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
    })

    it('should load user from localStorage on mount', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@augello.be',
        groups: ['group1'],
      }
      const mockToken = 'test-token-123'

      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('user').textContent).toBe('testuser')
      expect(screen.getByTestId('token').textContent).toBe(mockToken)
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')
    })

    it('should handle invalid JSON in localStorage', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      localStorage.setItem('auth_token', 'test-token')
      localStorage.setItem('auth_user', 'invalid-json{{{')

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('token').textContent).toBe('null')

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBeNull()
        expect(localStorage.getItem('auth_user')).toBeNull()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse stored user:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('logout function', () => {
    it('should logout and clear localStorage', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@augello.be',
        groups: [],
      }
      const mockToken = 'test-token-123'

      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))

      const { getByText } = render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('user').textContent).toBe('testuser')
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')

      const logoutButton = getByText('Logout')
      logoutButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null')
      })

      expect(screen.getByTestId('token').textContent).toBe('null')
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('auth_user')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('isAuthenticated property', () => {
    it('should be true when token exists', async () => {
      localStorage.setItem('auth_token', 'some-token')
      localStorage.setItem(
        'auth_user',
        JSON.stringify({ id: '1', username: 'test', email: 'test@augello.be', groups: [] })
      )

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')
      })
    })

    it('should be false when token does not exist', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
      })
    })
  })
})
