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
      expect(screen.getByText(/Your AI-Powered/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Meal Prep Revolution/i).length).toBeGreaterThan(0)
    })

    it('should render hero description', () => {
      renderWithRouter(<Landing />)
      expect(
        screen.getByText(/Intelligent meal planning meets effortless grocery shopping/i)
      ).toBeInTheDocument()
    })

    it('should render Get Started Free button', () => {
      renderWithRouter(<Landing />)
      const buttons = screen.getAllByText('Get Started Free')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should render Learn Course button', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Learn Course')).toBeInTheDocument()
    })
  })

  describe('features section', () => {
    it('should render AI-Personalized Plans feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('AI-Personalized Plans')).toBeInTheDocument()
      expect(
        screen.getByText(/Get custom meal plans tailored to your preferences/i)
      ).toBeInTheDocument()
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
      expect(
        screen.getByText(/Plan smarter, waste less/i)
      ).toBeInTheDocument()
    })

    it('should render Calorie Tracking feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Calorie Tracking & Nutrition')).toBeInTheDocument()
      expect(
        screen.getByText(/Monitor your nutrition intake with detailed tracking/i)
      ).toBeInTheDocument()
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
      expect(screen.getByText('1. Visualize Meal')).toBeInTheDocument()
      expect(
        screen.getByText(/Browse recipes or let AI suggest meals/i)
      ).toBeInTheDocument()
    })

    it('should render step 2', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('2. AI Builds a Meal Plan')).toBeInTheDocument()
      expect(
        screen.getByText(/Smart algorithm creates balanced meal plans/i)
      ).toBeInTheDocument()
    })

    it('should render step 3', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('3. Get Smart Lists')).toBeInTheDocument()
      expect(
        screen.getByText(/Auto-generated shopping lists with price comparisons/i)
      ).toBeInTheDocument()
    })

    it('should render step 4', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('4. Cook Meals')).toBeInTheDocument()
      expect(
        screen.getByText(/Follow step-by-step instructions and enjoy delicious homemade meals/i)
      ).toBeInTheDocument()
    })
  })

  describe('CTA section', () => {
    it('should render CTA heading', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/Get Access to/i)).toBeInTheDocument()
      expect(screen.getByText(/on the Web/i)).toBeInTheDocument()
    })

    it('should render CTA description', () => {
      renderWithRouter(<Landing />)
      expect(
        screen.getByText(/Start your meal prep revolution today/i)
      ).toBeInTheDocument()
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
