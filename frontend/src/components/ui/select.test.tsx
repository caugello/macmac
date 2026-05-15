import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Select } from './select'

describe('Select Component', () => {
  describe('rendering', () => {
    it('should render select element', () => {
      render(
        <Select>
          <option>Option 1</option>
        </Select>
      )
      const select = screen.getByRole('combobox')
      expect(select.tagName).toBe('SELECT')
    })

    it('should render with options', () => {
      render(
        <Select>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
          <option value="3">Option 3</option>
        </Select>
      )
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    it('should render with default value', () => {
      render(
        <Select defaultValue="2">
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      )
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('2')
    })
  })

  describe('interaction', () => {
    it('should call onChange handler when selection changes', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(
        <Select onChange={handleChange}>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')

      expect(handleChange).toHaveBeenCalled()
    })

    it('should update value on user selection', async () => {
      const user = userEvent.setup()
      render(
        <Select defaultValue="1">
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      )

      const select = screen.getByRole('combobox') as HTMLSelectElement
      await user.selectOptions(select, '2')

      expect(select.value).toBe('2')
    })

    it('should not trigger onChange when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(
        <Select onChange={handleChange} disabled>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(
        <Select disabled>
          <option>Option</option>
        </Select>
      )
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('should apply disabled cursor class', () => {
      render(
        <Select disabled>
          <option>Option</option>
        </Select>
      )
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should apply disabled opacity class', () => {
      render(
        <Select disabled>
          <option>Option</option>
        </Select>
      )
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('disabled:opacity-50')
    })
  })

  describe('HTML attributes', () => {
    it('should accept id attribute', () => {
      render(
        <Select id="select-id">
          <option>Option</option>
        </Select>
      )
      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'select-id')
    })

    it('should accept name attribute', () => {
      render(
        <Select name="category">
          <option>Option</option>
        </Select>
      )
      expect(screen.getByRole('combobox')).toHaveAttribute('name', 'category')
    })

    it('should accept required attribute', () => {
      render(
        <Select required>
          <option>Option</option>
        </Select>
      )
      expect(screen.getByRole('combobox')).toBeRequired()
    })

    it('should accept aria attributes', () => {
      render(
        <Select aria-label="test select">
          <option>Option</option>
        </Select>
      )
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'test select')
    })

    it('should accept data attributes', () => {
      render(
        <Select data-testid="select">
          <option>Option</option>
        </Select>
      )
      expect(screen.getByRole('combobox')).toHaveAttribute('data-testid', 'select')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(
        <Select className="custom-class">
          <option>Option</option>
        </Select>
      )
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('custom-class')
      expect(select).toHaveClass('flex')
      expect(select).toHaveClass('h-10')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref to select element', () => {
      const ref = { current: null }
      render(
        <Select ref={ref}>
          <option>Option</option>
        </Select>
      )
      expect(ref.current).not.toBeNull()
    })
  })

  describe('option groups', () => {
    it('should render optgroups', () => {
      render(
        <Select>
          <optgroup label="Group 1">
            <option value="1">Option 1</option>
          </optgroup>
          <optgroup label="Group 2">
            <option value="2">Option 2</option>
          </optgroup>
        </Select>
      )
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })
  })
})
