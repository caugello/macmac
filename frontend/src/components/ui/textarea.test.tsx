import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Textarea } from './textarea'

describe('Textarea Component', () => {
  describe('rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('should render with value', () => {
      render(<Textarea value="Test content" readOnly />)
      expect(screen.getByDisplayValue('Test content')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onChange handler when typing', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<Textarea onChange={handleChange} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello')

      expect(handleChange).toHaveBeenCalled()
    })

    it('should update value on user input', async () => {
      const user = userEvent.setup()
      render(<Textarea defaultValue="" />)

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      await user.type(textarea, 'New text')

      expect(textarea.value).toBe('New text')
    })

    it('should not trigger onChange when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<Textarea onChange={handleChange} disabled />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Test')

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Textarea disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should apply disabled cursor class', () => {
      render(<Textarea disabled />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should apply disabled opacity class', () => {
      render(<Textarea disabled />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('disabled:opacity-50')
    })
  })

  describe('HTML attributes', () => {
    it('should accept id attribute', () => {
      render(<Textarea id="textarea-id" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'textarea-id')
    })

    it('should accept name attribute', () => {
      render(<Textarea name="message" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'message')
    })

    it('should accept required attribute', () => {
      render(<Textarea required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('should accept rows attribute', () => {
      render(<Textarea rows={5} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5')
    })

    it('should accept cols attribute', () => {
      render(<Textarea cols={50} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('cols', '50')
    })

    it('should accept maxLength attribute', () => {
      render(<Textarea maxLength={100} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100')
    })

    it('should accept aria attributes', () => {
      render(<Textarea aria-label="test textarea" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'test textarea')
    })

    it('should accept data attributes', () => {
      render(<Textarea data-testid="textarea" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('data-testid', 'textarea')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Textarea className="custom-class" />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('custom-class')
      expect(textarea).toHaveClass('flex')
      expect(textarea).toHaveClass('min-h-[80px]')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null }
      render(<Textarea ref={ref} />)
      expect(ref.current).not.toBeNull()
    })
  })
})
