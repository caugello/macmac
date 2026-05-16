import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Login } from './Login'

const mockLoginWithGoogle = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    loginWithGoogle: mockLoginWithGoogle,
  }),
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render login page with Google sign-in button', () => {
      render(<Login />)

      expect(screen.getByText('Welcome to your digital pantry.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    })

    it('should render sign-in notice', () => {
      render(<Login />)

      expect(
        screen.getByText('Sign in with your Google account to get started.')
      ).toBeInTheDocument()
    })

    it('should render MacMac heading', () => {
      render(<Login />)

      expect(screen.getByText('MacMac')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    it('should call loginWithGoogle on button click', async () => {
      const user = userEvent.setup()
      mockLoginWithGoogle.mockResolvedValue(undefined)

      render(<Login />)

      const signInButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('loading state', () => {
    it('should show loading text when signing in', async () => {
      const user = userEvent.setup()
      let resolveLogin!: (value?: unknown) => void
      mockLoginWithGoogle.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve
        })
      )

      render(<Login />)

      const signInButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument()
      })

      resolveLogin()
    })

    it('should disable button during loading', async () => {
      const user = userEvent.setup()
      let resolveLogin!: (value?: unknown) => void
      mockLoginWithGoogle.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve
        })
      )

      render(<Login />)

      const signInButton = screen.getByRole('button', {
        name: /sign in with google/i,
      }) as HTMLButtonElement
      await user.click(signInButton)

      await waitFor(() => {
        expect(signInButton.disabled).toBe(true)
      })

      resolveLogin()
    })
  })

  describe('error handling', () => {
    it('should display error message when sign-in fails with API error', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = {
        response: {
          data: {
            detail: 'Authentication failed.',
          },
        },
      }
      mockLoginWithGoogle.mockRejectedValue(error)

      render(<Login />)

      const signInButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(screen.getByText('Authentication failed.')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should display generic error message when sign-in fails without detail', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockLoginWithGoogle.mockRejectedValue(new Error('Popup closed'))

      render(<Login />)

      const signInButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(screen.getByText('Popup closed')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should log errors to console', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Test error')
      mockLoginWithGoogle.mockRejectedValue(error)

      render(<Login />)

      const signInButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(signInButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Login error:', error)
      })

      consoleSpy.mockRestore()
    })
  })
})
