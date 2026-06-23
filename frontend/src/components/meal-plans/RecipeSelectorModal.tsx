import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRecipes } from '@/hooks/useRecipes'
import { useCreateMealPlan } from '@/hooks/useMealPlans'
import { SearchBar } from '@/components/shared/SearchBar'
import { Icon } from '@/components/ui/icon'
import { InlineRecipeForm } from '@/components/recipes/InlineRecipeForm'
import { RecipeCategoryFilter } from '@/components/recipes/RecipeCategoryFilter'
import { useToast } from '@/components/ui/use-toast'
import { RecipeCategoryEnum, type MealTypeEnum } from '@/lib/types'

interface RecipeSelectorModalProps {
  date: string
  mealType: MealTypeEnum
  onSelect: (recipeId: string) => void
  onClose: () => void
}

export const RecipeSelectorModal = ({
  date,
  mealType,
  onSelect,
  onClose,
}: RecipeSelectorModalProps) => {
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<RecipeCategoryEnum[]>([])
  const categoryParam = selectedCategories.length > 0 ? selectedCategories.join(',') : undefined
  const { data, isLoading, error } = useRecipes({ limit: 20, search, category: categoryParam })

  const toggleCategory = (category: RecipeCategoryEnum) =>
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  const createMealPlan = useCreateMealPlan()
  const { toast } = useToast()

  const handleRecipeCreated = (recipeId: string) => {
    createMealPlan.mutate(
      { date, meal_type: mealType, recipe_id: recipeId },
      {
        onSuccess: () => {
          toast('Recipe created and added to meal plan', 'success')
          onClose()
        },
        onError: () => {
          toast('Recipe created but failed to add to meal plan', 'error')
        },
      }
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-surface-container-lowest rounded-lg wireframe-border shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h2 className="text-headline-md font-heading font-semibold">
            {mode === 'select' ? 'Select Recipe' : 'New Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {mode === 'select' ? (
          <>
            <div className="px-4 pt-4 space-y-3">
              <RecipeCategoryFilter selected={selectedCategories} onToggle={toggleCategory} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search recipes..." />
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-lg dashed-outline text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
              >
                <Icon name="add_circle" size={20} />
                <span className="text-label-md">Create New Recipe</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="flex items-center gap-4 p-3 rounded-lg wireframe-border"
                    >
                      <div className="w-16 h-16 rounded-lg skeleton-shimmer shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                        <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {error && (
                <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
                  <Icon name="error" size={40} className="text-destructive opacity-50 mb-2" />
                  <p className="text-body-md text-destructive">Failed to load recipes</p>
                </div>
              )}
              {data && data.data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
                  <Icon name="restaurant_menu" size={40} className="opacity-30 mb-2" />
                  <p className="text-body-md">No recipes found</p>
                </div>
              )}
              {data?.data.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg wireframe-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-surface-container-low to-surface-container flex items-center justify-center shrink-0">
                    <Icon name="restaurant_menu" size={24} className="text-outline-variant/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-label-md font-semibold text-on-surface truncate">
                      {recipe.title}
                    </p>
                    <p className="text-caption text-on-surface-variant line-clamp-1">
                      {recipe.description || 'No description'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <InlineRecipeForm onSuccess={handleRecipeCreated} onCancel={() => setMode('select')} />
        )}
      </div>
    </div>,
    document.body
  )
}
