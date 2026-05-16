import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Landing } from './Landing'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Landing Page', () => {
  describe('rendering', () => {
    it('should render hero section', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/Your Digital/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Pantry/i).length).toBeGreaterThan(0)
    })

    it('should render hero description', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/A warm, organized space for your family/i)).toBeInTheDocument()
    })

    it('should render Get Started Free button', () => {
      renderWithRouter(<Landing />)
      const buttons = screen.getAllByText('Get Started Free')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should render Learn More button', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Learn More')).toBeInTheDocument()
    })
  })

  describe('features section', () => {
    it('should render Smart Meal Plans feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Smart Meal Plans')).toBeInTheDocument()
    })

    it('should render Smart Grocery Lists feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Smart Grocery Lists')).toBeInTheDocument()
      expect(
        screen.getByText(/Automatically generated shopping lists with real-time prices/i)
      ).toBeInTheDocument()
    })

    it('should render Reduce Food Waste feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Reduce Food Waste')).toBeInTheDocument()
      expect(screen.getByText(/Plan smarter, waste less/i)).toBeInTheDocument()
    })

    it('should render Nutrition Tracking feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Nutrition Tracking')).toBeInTheDocument()
      expect(screen.getByText(/Monitor your nutrition intake/i)).toBeInTheDocument()
    })
  })

  describe('how it works section', () => {
    it('should render How MacMac Works heading', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/How/)).toBeInTheDocument()
      expect(screen.getByText(/Works/)).toBeInTheDocument()
    })

    it('should render step 1', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('1. Browse Recipes')).toBeInTheDocument()
      expect(screen.getByText(/Browse your collection or create new recipes/i)).toBeInTheDocument()
    })

    it('should render step 2', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('2. Plan Your Week')).toBeInTheDocument()
      expect(screen.getByText(/Drag recipes into your weekly meal calendar/i)).toBeInTheDocument()
    })

    it('should render step 3', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('3. Get Smart Lists')).toBeInTheDocument()
      expect(
        screen.getByText(/Auto-generated shopping lists aggregated by category/i)
      ).toBeInTheDocument()
    })

    it('should render step 4', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('4. Cook & Enjoy')).toBeInTheDocument()
      expect(
        screen.getByText(/Follow step-by-step instructions and enjoy delicious homemade meals/i)
      ).toBeInTheDocument()
    })
  })

  describe('CTA section', () => {
    it('should render CTA heading', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/Digital Pantry/i)).toBeInTheDocument()
      expect(screen.getByText(/Awaits/i)).toBeInTheDocument()
    })

    it('should render CTA description', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/Start your meal planning journey today/i)).toBeInTheDocument()
    })
  })

  describe('navigation links', () => {
    it('should have Get Started Free buttons linking to /recipes', () => {
      renderWithRouter(<Landing />)
      const links = screen.getAllByText('Get Started Free')
      links.forEach((link) => {
        const anchor = link.closest('a')
        expect(anchor).toHaveAttribute('href', '/recipes')
      })
    })
  })

  describe('images', () => {
    it('should render hero image', () => {
      renderWithRouter(<Landing />)
      const image = screen.getByAltText('Meal prep preview')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', expect.stringContaining('unsplash.com'))
    })
  })
})
