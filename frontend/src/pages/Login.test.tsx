import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Login } from './Login'

// Mock useAuth hook
const mockLogin = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render login form', () => {
      render(<Login />)

      expect(screen.getByText('Welcome to your digital pantry.')).toBeInTheDocument()
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    it('should render demo credentials hint', () => {
      render(<Login />)

      expect(screen.getByText('Demo credentials: christophe / test')).toBeInTheDocument()
    })

    it('should have placeholder text in inputs', () => {
      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

      expect(usernameInput.placeholder).toBe('christophe')
      expect(passwordInput.placeholder).toBe('test')
    })

    it('should have correct input types', () => {
      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

      expect(usernameInput.type).toBe('text')
      expect(passwordInput.type).toBe('password')
    })

    it('should have autocomplete attributes', () => {
      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

      expect(usernameInput.autocomplete).toBe('username')
      expect(passwordInput.autocomplete).toBe('current-password')
    })
  })

  describe('user interactions', () => {
    it('should update username input on change', async () => {
      const user = userEvent.setup()
      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement

      await user.type(usernameInput, 'testuser')

      expect(usernameInput.value).toBe('testuser')
    })

    it('should update password input on change', async () => {
      const user = userEvent.setup()
      render(<Login />)

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

      await user.type(passwordInput, 'testpassword')

      expect(passwordInput.value).toBe('testpassword')
    })

    it('should call login on form submit with correct credentials', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /log in/i })

      await user.type(usernameInput, 'testuser')
      await user.type(passwordInput, 'testpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpassword')
      })
    })

    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      const { container } = render(<Login />)
      const form = container.querySelector('form')!

      const submitHandler = vi.fn((e) => e.preventDefault())
      form.addEventListener('submit', submitHandler)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')

      await user.type(usernameInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      expect(submitHandler).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show loading text when submitting', async () => {
      const user = userEvent.setup()
      let resolveLogin!: (value?: unknown) => void
      mockLogin.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve
        })
      )

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /log in/i })

      await user.type(usernameInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument()
      })

      // Resolve the login
      resolveLogin()
    })

    it('should disable inputs and button during loading', async () => {
      const user = userEvent.setup()
      let resolveLogin!: (value?: unknown) => void
      mockLogin.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve
        })
      )

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /log in/i }) as HTMLButtonElement

      await user.type(usernameInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(usernameInput.disabled).toBe(true)
        expect(passwordInput.disabled).toBe(true)
        expect(submitButton.disabled).toBe(true)
      })

      // Resolve the login
      resolveLogin()
    })

    it('should re-enable inputs after successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue(undefined)

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /log in/i }) as HTMLButtonElement

      await user.type(usernameInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(usernameInput.disabled).toBe(false)
        expect(passwordInput.disabled).toBe(false)
        expect(submitButton.disabled).toBe(false)
      })
    })
  })

  describe('error handling', () => {
    it('should display error message when login fails with API error', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = {
        response: {
          data: {
            detail: 'Invalid username or password',
          },
        },
      }
      mockLogin.mockRejectedValue(error)

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /log in/i })

      await user.type(usernameInput, 'wrong')
      await user.type(passwordInput, 'credentials')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should display generic error message when login fails without detail', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Network error')
      mockLogin.mockRejectedValue(error)

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /log in/i })

      await user.type(usernameInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should clear error message on new submission', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // First attempt fails
      const error = {
        response: {
          data: {
            detail: 'Invalid credentials',
          },
        },
      }
      mockLogin.mockRejectedValueOnce(error)

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /log in/i })

      // First failed attempt
      await user.type(usernameInput, 'wrong')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      // Second attempt should clear error
      mockLogin.mockResolvedValueOnce(undefined)

      await user.clear(usernameInput)
      await user.clear(passwordInput)
      await user.type(usernameInput, 'correct')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should log errors to console', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Test error')
      mockLogin.mockRejectedValue(error)

      render(<Login />)

      const usernameInput = screen.getByLabelText('Username')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /log in/i })

      await user.type(usernameInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.click(submitButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Login error:', error)
      })

      consoleSpy.mockRestore()
    })
  })

  describe('form validation', () => {
    it('should have required attributes on inputs', () => {
      render(<Login />)

      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

      expect(usernameInput.required).toBe(true)
      expect(passwordInput.required).toBe(true)
    })
  })
})
