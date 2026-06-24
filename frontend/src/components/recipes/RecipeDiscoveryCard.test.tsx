import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { RecipeDiscoveryCard } from './RecipeDiscoveryCard'
import { RecipeDifficultyEnum, UnitEnum, type RecipeOut } from '@/lib/types'

const baseRecipe: RecipeOut = {
  id: '1',
  title: 'Chocolate Cake',
  normalized_title: 'chocolate cake',
  description: 'Rich and moist',
  servings: 8,
  prep_time: null,
  calories: null,
  difficulty: null,
  image_url: null,
  category: null,
  ingredients: [
    { catalog_item_id: 'c1', catalog_item_name: 'Flour', qty: 200, unit: UnitEnum.GRAM },
  ],
  steps: ['Mix', 'Bake'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const renderCard = (recipe: RecipeOut) =>
  render(
    <BrowserRouter>
      <RecipeDiscoveryCard recipe={recipe} />
    </BrowserRouter>
  )

describe('RecipeDiscoveryCard', () => {
  it('renders prep time, calories and difficulty when present', () => {
    renderCard({
      ...baseRecipe,
      prep_time: 90,
      calories: 650,
      difficulty: RecipeDifficultyEnum.HARD,
    })

    expect(screen.getByText('1 h 30 min')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })

  it('omits prep time, calories and difficulty when missing', () => {
    renderCard(baseRecipe)

    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument()
    expect(screen.queryByText('Hard')).not.toBeInTheDocument()
  })

  it('renders the recipe image when image_url is present', () => {
    renderCard({ ...baseRecipe, image_url: 'https://example.com/cake.jpg' })

    const img = screen.getByAltText('Chocolate Cake')
    expect(img).toHaveAttribute('src', 'https://example.com/cake.jpg')
  })

  it('falls back to the hue placeholder when image_url is missing', () => {
    renderCard(baseRecipe)

    expect(screen.queryByAltText('Chocolate Cake')).not.toBeInTheDocument()
  })
})
