import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { authApi } from '@/api/auth'

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
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth()

  const handleLogin = async () => {
    try {
      await login('testuser', 'password')
    } catch {
      // Silently catch - error is logged in AuthContext
    }
  }

  return (
    <div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="isLoading">{isLoading ? 'true' : 'false'}</div>
      <button onClick={handleLogin}>Login</button>
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
      // Suppress console.error for this test
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
        email: 'test@example.com',
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

      // Check that localStorage was cleared after the component mounted
      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBeNull()
        expect(localStorage.getItem('auth_user')).toBeNull()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse stored user:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('login function', () => {
    it('should login successfully and navigate to /recipes', async () => {
      const mockResponse = {
        access_token: 'new-token',
        token_type: 'bearer',
        user: {
          id: '456',
          username: 'newuser',
          email: 'newuser@example.com',
          groups: [],
        },
      }

      vi.mocked(authApi.login).mockResolvedValue(mockResponse)

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

      // Click login button
      const loginButton = getByText('Login')
      loginButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('newuser')
      })

      expect(screen.getByTestId('token').textContent).toBe('new-token')
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')
      expect(localStorage.getItem('auth_token')).toBe('new-token')
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockResponse.user))
      expect(mockNavigate).toHaveBeenCalledWith('/recipes')
    })

    it('should handle login failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockError = new Error('Invalid credentials')

      vi.mocked(authApi.login).mockRejectedValue(mockError)

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

      const loginButton = getByText('Login')

      // Login should fail - click and wait for the error
      loginButton.click()

      // Wait for the login to be called and error to be logged
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Login failed:', mockError)
      })

      // Give a bit more time for state updates to settle
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null')
        expect(screen.getByTestId('token').textContent).toBe('null')
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('logout function', () => {
    it('should logout and clear localStorage', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
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

      // Verify user is logged in
      expect(screen.getByTestId('user').textContent).toBe('testuser')
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')

      // Click logout
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
        JSON.stringify({ id: '1', username: 'test', email: 'test@test.com', groups: [] })
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
