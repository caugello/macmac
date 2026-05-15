import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Sample test to verify testing setup works
describe('Testing Setup', () => {
  it('should render a basic component', () => {
    const TestComponent = () => <div>Hello, Testing!</div>

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    )

    expect(screen.getByText('Hello, Testing!')).toBeInTheDocument()
  })

  it('should handle basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('test').toBeTruthy()
    expect([1, 2, 3]).toHaveLength(3)
  })
})
