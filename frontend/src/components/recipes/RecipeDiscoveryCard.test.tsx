import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { RecipeDiscoveryCard } from './RecipeDiscoveryCard'
import { ToastProvider } from '@/components/ui/toast'
import { RecipeCategoryEnum, UnitEnum, type RecipeOut } from '@/lib/types'

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
  is_favorite: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const renderCard = (recipe: RecipeOut) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <RecipeDiscoveryCard recipe={recipe} />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('RecipeDiscoveryCard', () => {
  it('renders prep time and calories when present', () => {
    renderCard({
      ...baseRecipe,
      prep_time: 90,
      calories: 650,
    })

    expect(screen.getByText('1 h 30 min')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
  })

  it('omits prep time and calories when missing', () => {
    renderCard(baseRecipe)

    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument()
    expect(screen.queryByText(/min/)).not.toBeInTheDocument()
  })

  it('renders the category badge label', () => {
    renderCard({ ...baseRecipe, category: RecipeCategoryEnum.MAIN })

    expect(screen.getByText('Main')).toBeInTheDocument()
  })
})
