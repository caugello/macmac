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
      expect(screen.getByText(/AI reads every product/i)).toBeInTheDocument()
      expect(screen.getByText(/Your meal plan writes its own shopping list/i)).toBeInTheDocument()
    })

    it('should render hero description', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/MacMac crawls real store catalogs/i)).toBeInTheDocument()
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
    it('should render Meal plans feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Meal plans that know your store')).toBeInTheDocument()
    })

    it('should render Shopping lists feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Shopping lists with real prices')).toBeInTheDocument()
      expect(
        screen.getByText(/One click turns a week of meals into a priced, sorted shopping list/i)
      ).toBeInTheDocument()
    })

    it('should render Buy what you need feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Buy what you need, use what you buy')).toBeInTheDocument()
      expect(
        screen.getByText(/Precise quantities calculated from your recipes/i)
      ).toBeInTheDocument()
    })

    it('should render Nutri-Score feature', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('Nutri-Score on every product')).toBeInTheDocument()
      expect(screen.getByText(/AI extracts nutritional data/i)).toBeInTheDocument()
    })
  })

  describe('how it works section', () => {
    it('should render How It Works heading', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/How the/i)).toBeInTheDocument()
      expect(screen.getByText(/AI pipeline/i)).toBeInTheDocument()
    })

    it('should render step 1', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('1. Add your recipes')).toBeInTheDocument()
      expect(screen.getByText(/Build your family collection/i)).toBeInTheDocument()
    })

    it('should render step 2', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('2. Plan your meals')).toBeInTheDocument()
      expect(screen.getByText(/Drag recipes into your weekly calendar/i)).toBeInTheDocument()
    })

    it('should render step 3', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('3. AI does the math')).toBeInTheDocument()
      expect(
        screen.getByText(/MacMac matches every ingredient to real store products/i)
      ).toBeInTheDocument()
    })

    it('should render step 4', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText('4. Shop with confidence')).toBeInTheDocument()
      expect(
        screen.getByText(/Walk into the store knowing exactly what to buy/i)
      ).toBeInTheDocument()
    })
  })

  describe('CTA section', () => {
    it('should render CTA heading', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/Your store is already/i)).toBeInTheDocument()
    })

    it('should render CTA description', () => {
      renderWithRouter(<Landing />)
      expect(screen.getByText(/AI has read every product/i)).toBeInTheDocument()
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
