import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from './SearchBar'

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  describe('rendering', () => {
    it('should render search input', () => {
      const onChange = vi.fn()
      render(<SearchBar value="" onChange={onChange} />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with default placeholder', () => {
      const onChange = vi.fn()
      render(<SearchBar value="" onChange={onChange} />)

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      const onChange = vi.fn()
      render(<SearchBar value="" onChange={onChange} placeholder="Search recipes..." />)

      expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument()
    })

    it('should render with initial value', () => {
      const onChange = vi.fn()
      render(<SearchBar value="initial value" onChange={onChange} />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('initial value')
    })

    it('should render search icon', () => {
      const onChange = vi.fn()
      const { container } = render(<SearchBar value="" onChange={onChange} />)

      const icon = container.querySelector('.material-symbols-outlined')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('user interaction', () => {
    it('should update local value when typing', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SearchBar value="" onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect((input as HTMLInputElement).value).toBe('test')
    })

    it('should call onChange after debounce delay', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      render(<SearchBar value="" onChange={onChange} debounceMs={500} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      // Should not be called immediately
      expect(onChange).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(
        () => {
          expect(onChange).toHaveBeenCalledWith('test')
        },
        { timeout: 600 }
      )
    })

    it('should debounce multiple rapid changes', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      render(<SearchBar value="" onChange={onChange} debounceMs={300} />)

      const input = screen.getByRole('textbox')

      // Type quickly
      await user.type(input, 'a')
      await user.type(input, 'b')
      await user.type(input, 'c')

      // Should not be called immediately
      expect(onChange).not.toHaveBeenCalled()

      // Wait for debounce - should only be called once with final value
      await waitFor(
        () => {
          expect(onChange).toHaveBeenCalledWith('abc')
        },
        { timeout: 400 }
      )

      // Should only be called once despite multiple character inputs
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
      })
    })

    it('should use custom debounce time', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      render(<SearchBar value="" onChange={onChange} debounceMs={100} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      // Should be called faster with shorter debounce
      await waitFor(
        () => {
          expect(onChange).toHaveBeenCalledWith('test')
        },
        { timeout: 150 }
      )
    })
  })

  describe('controlled component behavior', () => {
    it('should update when value prop changes', () => {
      const onChange = vi.fn()
      const { rerender } = render(<SearchBar value="initial" onChange={onChange} />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('initial')

      // Update value prop
      rerender(<SearchBar value="updated" onChange={onChange} />)

      expect(input.value).toBe('updated')
    })

    it('should sync with external value changes', () => {
      const onChange = vi.fn()
      const { rerender } = render(<SearchBar value="" onChange={onChange} />)

      rerender(<SearchBar value="externally set" onChange={onChange} />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('externally set')
    })
  })

  describe('cleanup', () => {
    it('should clear timeout on unmount', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      const { unmount } = render(<SearchBar value="" onChange={onChange} debounceMs={500} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      // Unmount before debounce completes
      unmount()

      // Wait past debounce time
      await new Promise((resolve) => setTimeout(resolve, 600))

      // onChange should not be called after unmount
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty string input', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      render(<SearchBar value="initial" onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.clear(input)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('')
      })
    })

    it('should handle whitespace input', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      render(<SearchBar value="" onChange={onChange} debounceMs={100} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '   ')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('   ')
      })
    })

    it('should handle special characters', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = vi.fn()

      render(<SearchBar value="" onChange={onChange} debounceMs={100} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '@#$%')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('@#$%')
      })
    })
  })
})
