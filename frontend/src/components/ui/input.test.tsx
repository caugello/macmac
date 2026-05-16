import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input Component', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('should render with value', () => {
      render(<Input value="test value" onChange={() => {}} />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('test value')
    })
  })

  describe('input types', () => {
    it('should render text input by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.type).toBe('text')
    })

    it('should render password input', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.type).toBe('password')
    })

    it('should render email input', () => {
      render(<Input type="email" />)
      const input = document.querySelector('input[type="email"]') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.type).toBe('email')
    })

    it('should render number input', () => {
      render(<Input type="number" />)
      const input = document.querySelector('input[type="number"]') as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.type).toBe('number')
    })
  })

  describe('interaction', () => {
    it('should call onChange handler when typing', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<Input onChange={handleChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(handleChange).toHaveBeenCalled()
      expect(handleChange).toHaveBeenCalledTimes(4) // One call per character
    })

    it('should update value on user input', async () => {
      const user = userEvent.setup()

      render(<Input defaultValue="" />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      await user.type(input, 'hello')

      expect(input.value).toBe('hello')
    })

    it('should not trigger onChange when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<Input onChange={handleChange} disabled />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should apply disabled cursor class', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('disabled:cursor-not-allowed')
    })

    it('should apply disabled opacity class', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('disabled:opacity-50')
    })
  })

  describe('HTML attributes', () => {
    it('should accept id attribute', () => {
      render(<Input id="test-input" />)
      const input = document.getElementById('test-input')
      expect(input).toBeInTheDocument()
    })

    it('should accept name attribute', () => {
      render(<Input name="username" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.name).toBe('username')
    })

    it('should accept required attribute', () => {
      render(<Input required />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.required).toBe(true)
    })

    it('should accept autoComplete attribute', () => {
      render(<Input autoComplete="email" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.autocomplete).toBe('email')
    })

    it('should accept aria attributes', () => {
      render(<Input aria-label="Search" />)
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
    })

    it('should accept data attributes', () => {
      render(<Input data-testid="custom-input" />)
      expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Input className="custom-input" />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('custom-input')
      expect(input.className).toContain('rounded') // Default class
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      expect(ref).toHaveBeenCalled()
    })
  })

  describe('validation', () => {
    it('should accept min and max for number input', () => {
      render(<Input type="number" min={0} max={100} />)
      const input = screen.getByRole('spinbutton') as HTMLInputElement
      expect(input.min).toBe('0')
      expect(input.max).toBe('100')
    })

    it('should accept maxLength attribute', () => {
      render(<Input maxLength={50} />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.maxLength).toBe(50)
    })

    it('should accept pattern attribute', () => {
      render(<Input pattern="[0-9]{3}" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.pattern).toBe('[0-9]{3}')
    })
  })
})
