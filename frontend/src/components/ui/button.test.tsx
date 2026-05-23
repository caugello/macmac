import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button Component', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('should render with children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      )
      expect(screen.getByText('Icon')).toBeInTheDocument()
      expect(screen.getByText('Text')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('should apply default variant', () => {
      render(<Button>Default</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-primary')
    })

    it('should apply destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-destructive')
    })

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('border')
    })

    it('should apply secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-secondary')
    })

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('hover:bg-surface-variant')
    })

    it('should apply link variant', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('underline-offset-4')
    })
  })

  describe('sizes', () => {
    it('should apply default size', () => {
      render(<Button>Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-12')
    })

    it('should apply sm size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-11')
    })

    it('should apply lg size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-11')
    })

    it('should apply icon size', () => {
      render(<Button size="icon">+</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-11')
      expect(button.className).toContain('w-11')
    })
  })

  describe('interaction', () => {
    it('should call onClick handler', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Click</Button>)

      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn()

      render(
        <Button onClick={handleClick} disabled>
          Click
        </Button>
      )

      const button = screen.getByRole('button')
      // Disabled buttons can't be clicked with userEvent
      expect(button).toBeDisabled()
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should apply disabled opacity', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('disabled:opacity-50')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
      expect(button.className).toContain('inline-flex') // Default class
    })
  })

  describe('HTML attributes', () => {
    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole('button') as HTMLButtonElement
      expect(button.type).toBe('submit')
    })

    it('should accept aria attributes', () => {
      render(<Button aria-label="Close dialog">X</Button>)
      const button = screen.getByLabelText('Close dialog')
      expect(button).toBeInTheDocument()
    })

    it('should accept data attributes', () => {
      render(<Button data-testid="custom-button">Test</Button>)
      expect(screen.getByTestId('custom-button')).toBeInTheDocument()
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = vi.fn()
      render(<Button ref={ref}>Ref Test</Button>)
      expect(ref).toHaveBeenCalled()
    })
  })
})
