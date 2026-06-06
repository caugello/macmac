import { useState } from 'react'
import { useCreateRecipe } from '@/hooks/useRecipes'
import { RecipeCategoryEnum, type IngredientCreate, type CatalogItemOut } from '@/lib/types'
import { RECIPE_CATEGORIES } from '@/lib/recipeCategory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { IngredientEditor } from '@/components/recipes/IngredientEditor'
import { Icon } from '@/components/ui/icon'

interface InlineRecipeFormProps {
  onSuccess: (recipeId: string) => void
  onCancel: () => void
}

export const InlineRecipeForm = ({ onSuccess, onCancel }: InlineRecipeFormProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RecipeCategoryEnum | ''>('')
  const [ingredients, setIngredients] = useState<
    (IngredientCreate & { _catalog_item?: CatalogItemOut })[]
  >([])
  const [validationError, setValidationError] = useState<string | null>(null)

  const createRecipe = useCreateRecipe()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const trimmedTitle = title.trim()
    if (trimmedTitle.length < 2) {
      setValidationError('Title must be at least 2 characters')
      return
    }

    if (ingredients.length === 0) {
      setValidationError('Add at least one ingredient')
      return
    }

    const cleanIngredients: IngredientCreate[] = ingredients.map(
      ({ catalog_item_id, qty, unit }) => ({
        catalog_item_id,
        qty,
        unit,
      })
    )

    createRecipe.mutate(
      {
        title: trimmedTitle,
        description: description.trim() || undefined,
        category: category || undefined,
        ingredients: cleanIngredients,
      },
      {
        onSuccess: (recipe) => {
          onSuccess(recipe.id)
        },
        onError: () => {
          setValidationError('Failed to create recipe. Please try again.')
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {validationError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-label-md">
            <Icon name="error" size={18} />
            {validationError}
          </div>
        )}

        <div>
          <label htmlFor="inline-title" className="block text-label-md font-semibold mb-1.5">
            Title *
          </label>
          <Input
            id="inline-title"
            placeholder="e.g., Pasta Bolognese"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={200}
            disabled={createRecipe.isPending}
          />
        </div>

        <div>
          <label htmlFor="inline-description" className="block text-label-md font-semibold mb-1.5">
            Description
          </label>
          <Textarea
            id="inline-description"
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={createRecipe.isPending}
          />
        </div>

        <div>
          <label htmlFor="inline-category" className="block text-label-md font-semibold mb-1.5">
            Category
          </label>
          <Select
            id="inline-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RecipeCategoryEnum | '')}
            disabled={createRecipe.isPending}
          >
            <option value="">Uncategorized</option>
            {RECIPE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-label-md font-semibold mb-1.5">Ingredients *</label>
          <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
        </div>
      </div>

      <div className="p-4 border-t border-outline-variant space-y-2">
        <Button
          type="submit"
          disabled={createRecipe.isPending}
          className="w-full rounded-full h-12"
        >
          {createRecipe.isPending ? (
            <>
              <Icon name="progress_activity" size={18} className="animate-spin mr-2" />
              Creating...
            </>
          ) : (
            'Create & Add'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={createRecipe.isPending}
          className="w-full rounded-full h-12"
        >
          Back to Recipes
        </Button>
      </div>
    </form>
  )
}
