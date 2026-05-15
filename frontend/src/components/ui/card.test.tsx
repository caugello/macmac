import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with children', () => {
      render(<Card>Card Content</Card>)
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('custom-card')
      expect(card).toHaveClass('rounded-lg')
    })

    it('should forward ref', () => {
      const ref = { current: null }
      render(<Card ref={ref}>Content</Card>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('CardHeader', () => {
    it('should render header with children', () => {
      render(<CardHeader>Header Content</CardHeader>)
      expect(screen.getByText('Header Content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<CardHeader className="custom-header">Content</CardHeader>)
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('custom-header')
      expect(header).toHaveClass('flex')
    })

    it('should forward ref', () => {
      const ref = { current: null }
      render(<CardHeader ref={ref}>Content</CardHeader>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('CardTitle', () => {
    it('should render title with children', () => {
      render(<CardTitle>Title Text</CardTitle>)
      expect(screen.getByText('Title Text')).toBeInTheDocument()
    })

    it('should render as h3 element', () => {
      const { container } = render(<CardTitle>Title</CardTitle>)
      const title = container.querySelector('h3')
      expect(title).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<CardTitle className="custom-title">Title</CardTitle>)
      const title = container.firstChild as HTMLElement
      expect(title).toHaveClass('custom-title')
      expect(title).toHaveClass('text-2xl')
    })

    it('should forward ref', () => {
      const ref = { current: null }
      render(<CardTitle ref={ref}>Title</CardTitle>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('CardDescription', () => {
    it('should render description with children', () => {
      render(<CardDescription>Description Text</CardDescription>)
      expect(screen.getByText('Description Text')).toBeInTheDocument()
    })

    it('should render as p element', () => {
      const { container } = render(<CardDescription>Description</CardDescription>)
      const description = container.querySelector('p')
      expect(description).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <CardDescription className="custom-desc">Description</CardDescription>
      )
      const description = container.firstChild as HTMLElement
      expect(description).toHaveClass('custom-desc')
      expect(description).toHaveClass('text-sm')
    })

    it('should forward ref', () => {
      const ref = { current: null }
      render(<CardDescription ref={ref}>Description</CardDescription>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('CardContent', () => {
    it('should render content with children', () => {
      render(<CardContent>Main Content</CardContent>)
      expect(screen.getByText('Main Content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<CardContent className="custom-content">Content</CardContent>)
      const content = container.firstChild as HTMLElement
      expect(content).toHaveClass('custom-content')
      expect(content).toHaveClass('p-6')
    })

    it('should forward ref', () => {
      const ref = { current: null }
      render(<CardContent ref={ref}>Content</CardContent>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('CardFooter', () => {
    it('should render footer with children', () => {
      render(<CardFooter>Footer Content</CardFooter>)
      expect(screen.getByText('Footer Content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>)
      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('custom-footer')
      expect(footer).toHaveClass('flex')
    })

    it('should forward ref', () => {
      const ref = { current: null }
      render(<CardFooter ref={ref}>Footer</CardFooter>)
      expect(ref.current).not.toBeNull()
    })
  })

  describe('Complete Card', () => {
    it('should render complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Card Content')).toBeInTheDocument()
      expect(screen.getByText('Card Footer')).toBeInTheDocument()
    })
  })
})
