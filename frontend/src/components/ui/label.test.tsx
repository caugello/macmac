import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Label } from './label'

describe('Label Component', () => {
  describe('rendering', () => {
    it('should render label with text', () => {
      render(<Label>Test Label</Label>)
      expect(screen.getByText('Test Label')).toBeInTheDocument()
    })

    it('should render with children', () => {
      render(
        <Label>
          <span>Label Content</span>
        </Label>
      )
      expect(screen.getByText('Label Content')).toBeInTheDocument()
    })
  })

  describe('HTML attributes', () => {
    it('should accept htmlFor attribute', () => {
      render(<Label htmlFor="input-id">Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveAttribute('for', 'input-id')
    })

    it('should accept data attributes', () => {
      render(<Label data-testid="label">Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveAttribute('data-testid', 'label')
    })

    it('should accept aria attributes', () => {
      render(<Label aria-label="test label">Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveAttribute('aria-label', 'test label')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Label className="custom-label">Label</Label>)
      const label = screen.getByText('Label')
      expect(label).toHaveClass('custom-label')
      expect(label).toHaveClass('text-sm')
      expect(label).toHaveClass('font-medium')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to label element', () => {
      const ref = { current: null }
      render(<Label ref={ref}>Label</Label>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('integration with input', () => {
    it('should be associated with input element', () => {
      render(
        <>
          <Label htmlFor="test-input">Username</Label>
          <input id="test-input" type="text" />
        </>
      )
      const label = screen.getByText('Username')
      const input = document.getElementById('test-input')
      expect(label).toHaveAttribute('for', 'test-input')
      expect(input).toBeInTheDocument()
    })
  })
})
